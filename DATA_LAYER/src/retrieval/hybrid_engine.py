"""Hybrid Retrieval Engine for NWIS"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid

from src.config.settings import get_settings
from src.models.supabase_schema import get_supabase_client, get_repositories, haversine_km
from src.models.graphify_ontology import get_graphify_client, NodeLabel, RelationshipType
from src.models.graph_resolver import get_graph_backend
from src.models.chromadb_client import get_chromadb_client, build_metadata_filter, CollectionName

logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# QUERY UNDERSTANDING
# =============================================================================

class QueryIntent(Enum):
    OFFSET_WELL_EVENT_SEARCH = "offset_well_event_search"
    FORMATION_KNOWLEDGE = "formation_knowledge"
    WELL_SUMMARY = "well_summary"
    LESSONS_LEARNED = "lessons_learned"
    RISK_ASSESSMENT = "risk_assessment"
    ANALOGUE_MATCHING = "analogue_matching"
    REAL_TIME_CONTEXTUAL = "real_time_contextual"
    GENERAL_SEARCH = "general_search"


@dataclass
class ParsedQuery:
    """Parsed and understood query"""
    intent: QueryIntent
    raw_query: str
    well_id: Optional[str] = None
    well_code: Optional[str] = None
    formation: Optional[str] = None
    formation_id: Optional[str] = None
    depth_from: Optional[float] = None
    depth_to: Optional[float] = None
    radius_km: Optional[float] = None
    event_types: List[str] = field(default_factory=list)
    document_types: List[str] = field(default_factory=list)
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_depth: Optional[float] = None
    current_formation: Optional[str] = None
    active_well_id: Optional[str] = None
    confidence: float = 0.0


class QueryParser:
    """Parse and understand natural language queries"""
    
    def __init__(self):
        self.nlp = None
        self._init_nlp()
    
    def _init_nlp(self):
        try:
            import spacy
            self.nlp = spacy.load(settings.nlp.spacy_model)
        except Exception as error:
            logger.warning("spaCy model %s unavailable: %s", settings.nlp.spacy_model, error)
    
    def parse(self, query: str, context: Dict = None) -> ParsedQuery:
        """Parse a natural language query"""
        query_lower = query.lower()
        context = context or {}
        
        # Determine intent
        intent = self._classify_intent(query_lower)
        
        # Extract entities
        parsed = ParsedQuery(
            intent=intent,
            raw_query=query,
            well_id=context.get("well_id"),
            well_code=context.get("well_code"),
            formation=context.get("formation"),
            formation_id=context.get("formation_id"),
            depth_from=context.get("depth_from"),
            depth_to=context.get("depth_to"),
            radius_km=context.get("radius_km", settings.retrieval.default_search_radius_km),
            latitude=context.get("latitude"),
            longitude=context.get("longitude"),
            current_depth=context.get("current_depth"),
            current_formation=context.get("current_formation"),
            active_well_id=context.get("active_well_id"),
        )
        
        # Extract from query text
        self._extract_entities(query, parsed)
        self._extract_numbers(query, parsed)
        
        return parsed
    
    def _classify_intent(self, query: str) -> QueryIntent:
        """Classify query intent"""
        if any(kw in query for kw in ["nearby", "offset", "near", "surrounding", "adjacent"]):
            if any(kw in query for kw in ["event", "problem", "issue", "incident", "loss", "stuck", "kick"]):
                return QueryIntent.OFFSET_WELL_EVENT_SEARCH
        
        if any(kw in query for kw in ["formation", "geology", "lithology", "stratigraphic"]):
            return QueryIntent.FORMATION_KNOWLEDGE
        
        if any(kw in query for kw in ["well summary", "well history", "well overview"]):
            return QueryIntent.WELL_SUMMARY
        
        if any(kw in query for kw in ["lesson", "learned", "best practice", "recommendation"]):
            return QueryIntent.LESSONS_LEARNED
        
        if any(kw in query for kw in ["risk", "hazard", "probability", "likelihood"]):
            return QueryIntent.RISK_ASSESSMENT
        
        if any(kw in query for kw in ["analogue", "similar", "comparable", "offset well"]):
            return QueryIntent.ANALOGUE_MATCHING
        
        if any(kw in query for kw in ["current", "now", "real-time", "live", "present"]):
            return QueryIntent.REAL_TIME_CONTEXTUAL
        
        return QueryIntent.GENERAL_SEARCH
    
    def _extract_entities(self, query: str, parsed: ParsedQuery):
        """Extract entities from query"""
        import re
        
        # Formation - accept codes like Formation-X, FORMATION_BETA, formation 12
        formation_match = re.search(
            r'\b(?i:formation)[\s\-_]+([A-Za-z0-9][A-Za-z0-9\-]*)', query
        )
        if formation_match:
            candidate = formation_match.group(1)
            if self._looks_like_code(candidate, query, formation_match.start(1)):
                parsed.formation = candidate.upper()
        
        # Well code - accept well ABC-1, well 12-3, well W-100
        well_match = re.search(
            r'\b(?i:well)[\s\-_]+([A-Za-z0-9][A-Za-z0-9\-]*)', query
        )
        if well_match:
            candidate = well_match.group(1)
            if self._looks_like_code(candidate, query, well_match.start(1)):
                parsed.well_code = candidate.upper()
        
        # Event types
        event_keywords = {
            "mud loss": "MUD_LOSS",
            "lost circulation": "MUD_LOSS",
            "kick": "KICK",
            "stuck pipe": "STUCK_PIPE",
            "pack off": "PACK_OFF",
            "torque spike": "TORQUE_SPIKE",
            "pressure spike": "PRESSURE_SPIKE",
            "wellbore instability": "WELLBORE_INSTABILITY",
            "fishing": "FISHING",
            "cement failure": "CEMENT_FAILURE",
        }
        
        for kw, et in event_keywords.items():
            if kw in query.lower():
                parsed.event_types.append(et)
    
    @staticmethod
    def _looks_like_code(candidate: str, query: str, start: int) -> bool:
        """Distinguish an identifier from an ordinary English word."""
        if not candidate:
            return False
        if any(char.isdigit() for char in candidate):
            return True
        if "-" in candidate or "_" in candidate:
            return True
        return candidate.isupper()
    
    def _extract_numbers(self, query: str, parsed: ParsedQuery):
        """Extract numbers (depth, radius, coordinates)"""
        import re
        
        # Depth range where the unit is written once: "between 3150 and 3250 m",
        # "3150-3250 m", "from 3150 to 3250 m". This must be tried before the
        # single-reading pattern, which would otherwise only see "3250 m".
        num = r'(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)'
        unit = r'(?:meters?\b|m\b|ft\b|feet\b)'
        range_match = re.search(
            rf'(?i)(?:between|from)?\s*({num})\s*(?:and|to|-|\u2013)\s*({num})\s*{unit}',
            query
        )
        if range_match:
            first = float(range_match.group(1).replace(',', ''))
            second = float(range_match.group(2).replace(',', ''))
            parsed.depth_from = min(first, second)
            parsed.depth_to = max(first, second)
            if parsed.current_depth is None:
                parsed.current_depth = (parsed.depth_from + parsed.depth_to) / 2

        # Depth range - match the full number, including thousands separators,
        # so "3200 m" is not read as "200 m".
        depth_matches = list(re.finditer(
            rf'(?i)({num})\s*{unit}',
            query
        ))
        if depth_matches and parsed.depth_from is None:
            depths = [float(m.group(1).replace(',', '')) for m in depth_matches]
            if len(depths) >= 2:
                parsed.depth_from = min(depths)
                parsed.depth_to = max(depths)
            elif len(depths) == 1:
                # Only treat the reading as approximate when "around"/"near" sits
                # next to the depth itself; "near 28.575, -101.355" is a location.
                prefix = query[:depth_matches[0].start(1)].lower()
                approximate = re.search(r'(?:around|near|about|approx|~)\s*$', prefix) \
                    or re.search(r'\b(?:around|near|about|approx)\b[^,]{0,12}$', prefix)
                if approximate:
                    tol = settings.retrieval.default_depth_tolerance_m
                    parsed.depth_from = depths[0] - tol
                    parsed.depth_to = depths[0] + tol
                else:
                    parsed.depth_from = depths[0]
                    parsed.depth_to = depths[0]
            # The depth-scoped graph stages key off current_depth, so always
            # derive it: a single reading, or the midpoint of a range.
            if parsed.current_depth is None:
                parsed.current_depth = sum(sorted(set(depths))[:2]) / 2 if len(set(depths)) > 1 else depths[0]

        # Coordinates: "28.61, -101.32", "lat 28.61 lon -101.32", "28.61N 101.32W"
        if parsed.latitude is None or parsed.longitude is None:
            lat, lon = self._extract_coordinates(query)
            if lat is not None:
                parsed.latitude = lat
            if lon is not None:
                parsed.longitude = lon

        # Radius
        radius_match = re.search(r'(?i)(?:radius|within)\s*(\d+(?:\.\d+)?)\s*(?:km|kilometers?)', query)
        if radius_match:
            parsed.radius_km = float(radius_match.group(1))

    @staticmethod
    def _extract_coordinates(query: str):
        """Pull a lat/lon pair out of free text, tolerating N/S/E/W suffixes."""
        import re
        text = query.strip()

        # Hemisphere-suffixed form: 28.61N 101.32W
        hemi = re.search(
            r'(?i)(-?\d{1,3}(?:\.\d+)?)\s*([NS])(?:\s+|,|/)(-?\d{1,3}(?:\.\d+)?)\s*([EW])',
            text
        )
        if hemi:
            lat = float(hemi.group(1)) * (-1 if hemi.group(2).upper() == 'S' else 1)
            lon = float(hemi.group(3)) * (-1 if hemi.group(4).upper() == 'W' else 1)
            return lat, lon

        # Labelled form: latitude 28.6, longitude -101.3
        labelled = re.search(
            r'(?i)lat(?:itude)?\s*[:=]?\s*(-?\d{1,3}(?:\.\d+)?)'
            r'.*?lon(?:g|gitude)?\s*[:=]?\s*(-?\d{1,3}(?:\.\d+)?)',
            text
        )
        if labelled:
            return float(labelled.group(1)), float(labelled.group(2))

        # Bare pair: "28.61, -101.32" (a comma, space or slash separated pair)
        pair = re.search(
            r'(-?\d{1,3}(?:\.\d+)?)\s*(?:,|;|/|\s)\s*(-?\d{1,3}(?:\.\d+)?)',
            text
        )
        if pair:
            lat, lon = float(pair.group(1)), float(pair.group(2))
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
        return None, None


# =============================================================================
# RETRIEVAL RESULTS
# =============================================================================

@dataclass
class RetrievalResult:
    """Unified retrieval result"""
    source: str  # "graph", "sql", "chromadb"
    type: str    # "event", "well", "formation", "chunk", "lesson", "document"
    id: str
    score: float
    data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    provenance: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ContextPackage:
    """Structured context for LLM/RAG"""
    active_well: Dict[str, Any] = field(default_factory=dict)
    nearby_wells: List[Dict[str, Any]] = field(default_factory=list)
    historical_events: List[Dict[str, Any]] = field(default_factory=list)
    lessons: List[Dict[str, Any]] = field(default_factory=list)
    formations: List[Dict[str, Any]] = field(default_factory=list)
    risk_patterns: List[Dict[str, Any]] = field(default_factory=list)
    source_documents: List[Dict[str, Any]] = field(default_factory=list)
    store_status: Dict[str, str] = field(default_factory=dict)
    graph_backend: str = ""  # "neo4j", "local" or "unavailable"
    query: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# =============================================================================
# HYBRID RETRIEVAL ENGINE
# =============================================================================

class HybridRetrievalEngine:
    """Main hybrid retrieval engine combining Graph, Vector, and SQL"""
    
    def __init__(self):
        if (settings.sql.backend or "local").lower() == "supabase":
            self.supabase = get_supabase_client()
        else:
            self.supabase = None
        self.repos = get_repositories(self.supabase)
        # Graph reads/writes go through the configured backend: the offline local
        # graph by default, or Neo4j when selected/reachable.
        self.graph, self.graph_backend = get_graph_backend()
        self.graphify = self.graph
        self.chromadb = get_chromadb_client()
        self.parser = QueryParser()
    
    def retrieve(self, query: str, context: Dict = None, top_k: int = None, progress_callback=None) -> ContextPackage:
        """Main retrieval entry point"""
        top_k = top_k or settings.retrieval.default_top_k
        
        # Stage 1: Query Understanding
        parsed = self.parser.parse(query, context)
        self._report_progress(progress_callback, "understanding", "Understanding query")
        logger.info(f"Parsed query: intent={parsed.intent}, formation={parsed.formation}, depth=({parsed.depth_from}, {parsed.depth_to})")
        self._report_progress(progress_callback, "routing", f"Intent: {parsed.intent.value}")
        
        # Stage 2: Execute retrieval based on intent
        if parsed.intent == QueryIntent.OFFSET_WELL_EVENT_SEARCH:
            return self._retrieve_offset_events(parsed, top_k, progress_callback)
        elif parsed.intent == QueryIntent.FORMATION_KNOWLEDGE:
            return self._retrieve_formation_knowledge(parsed, top_k, progress_callback)
        elif parsed.intent == QueryIntent.WELL_SUMMARY:
            return self._retrieve_well_summary(parsed, top_k, progress_callback)
        elif parsed.intent == QueryIntent.LESSONS_LEARNED:
            return self._retrieve_lessons(parsed, top_k, progress_callback)
        elif parsed.intent == QueryIntent.RISK_ASSESSMENT:
            return self._retrieve_risk_assessment(parsed, top_k, progress_callback)
        elif parsed.intent == QueryIntent.ANALOGUE_MATCHING:
            return self._retrieve_analogues(parsed, top_k, progress_callback)
        elif parsed.intent == QueryIntent.REAL_TIME_CONTEXTUAL:
            return self._retrieve_real_time_context(parsed, top_k, progress_callback)
        else:
            return self._retrieve_general(parsed, top_k, progress_callback)

    @staticmethod
    def _report_progress(callback, stage: str, message: str):
        if callback:
            callback(stage, message)

    def _report_idle_stages(self, ctx: ContextPackage, progress_callback, skipped: Dict[str, str]):
        """Emit progress for stages an intent did not exercise, so the trace stays complete."""
        for stage, message in skipped.items():
            self._report_progress(progress_callback, stage, message)
        self._report_progress(progress_callback, "ranking", "Ranking retrieved evidence")

    def _new_context(self, parsed: ParsedQuery) -> ContextPackage:
        """Create a context package stamped with the graph backend actually in use."""
        return ContextPackage(query=parsed.raw_query, graph_backend=self.graph_backend or "unavailable")
    
    def _store_call(self, ctx: ContextPackage, store: str, operation, default=None):
        """Run a store operation, recording availability instead of failing the search."""
        try:
            result = operation()
            ctx.store_status[store] = "ok"
            return result
        except Exception as error:
            ctx.store_status[store] = f"unavailable: {type(error).__name__}"
            logger.warning("%s unavailable during retrieval: %s", store, error)
            return default
    
    def _retrieve_offset_events(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Retrieve events from nearby offset wells"""
        ctx = self._new_context(parsed)
        
        # Get active well context
        if parsed.active_well_id:
            self._report_progress(progress_callback, "structured", "Loading active well from the structured store")
            active_well = self._store_call(ctx, "supabase", lambda: self.repos["wells"].get_well(parsed.active_well_id))
            if active_well:
                ctx.active_well = active_well
                parsed.latitude = active_well.get("surface_latitude")
                parsed.longitude = active_well.get("surface_longitude")
                parsed.current_depth = active_well.get("total_depth_md") or parsed.current_depth
                parsed.current_formation = parsed.current_formation or active_well.get("current_formation")
        
        # Stage 2: Geographic filtering - find nearby wells
        nearby_wells = []
        if parsed.latitude and parsed.longitude:
            radius = parsed.radius_km or settings.retrieval.default_search_radius_km
            self._report_progress(progress_callback, "structured", f"Filtering offset wells within {radius} km")
            nearby_wells = self._store_call(
                ctx, "supabase",
                lambda: self.repos["wells"].get_nearby_wells(
                    parsed.latitude, parsed.longitude, radius, limit=20
                ),
                [],
            ) or []
            ctx.nearby_wells = nearby_wells
            nearby_well_ids = [w["id"] for w in nearby_wells if w.get("id")]
            self._report_progress(
                progress_callback, "structured",
                f"{len(nearby_well_ids)} offset well(s) in scope",
            )
        else:
            self._report_progress(
                progress_callback, "structured",
                "No coordinates given - no radius filter; scoping SQL by formation and depth instead",
            )
            nearby_well_ids = []
        
        # Stage 3: Geological filtering + graph expansion
        formation_well_ids = []
        if parsed.formation:
            self._report_progress(progress_callback, "graph", f"Expanding knowledge graph for {parsed.formation}")
            formation = self._store_call(
                ctx, "supabase",
                lambda: self.repos["formations"].get_formation_by_code(parsed.formation),
            )
            if formation:
                parsed.formation_id = formation["id"]
                ctx.formations.append(formation)
                wells_with_formation = self._store_call(
                    ctx, "graph",
                    lambda: self.graph.find_wells_by_formation(parsed.formation),
                    [],
                ) or []
                formation_well_ids = [w.get("well_id") for w in wells_with_formation if w.get("well_id")]
                # The graph keys wells by entity id but SQL keys them by UUID;
                # translate before the ids are used for SQL filtering below.
                entity_to_sql = self._store_call(
                    ctx, "supabase",
                    lambda: self.repos["wells"].get_well_ids_by_entity_ids(formation_well_ids),
                    {},
                ) or {}
                if entity_to_sql:
                    formation_well_ids = [
                        entity_to_sql[eid] for eid in formation_well_ids if eid in entity_to_sql
                    ]
                else:
                    # No SQL counterpart (e.g. a well that only exists in the
                    # graph); keep the entity ids so the graph stages still run.
                    self._report_progress(
                        progress_callback, "graph",
                        "Graph wells have no SQL counterpart - using entity ids",
                    )
                self._report_progress(
                    progress_callback, "graph",
                    f"Graph links {len(formation_well_ids)} well(s) to {parsed.formation}",
                )
                
                # Intersect with nearby wells
                if nearby_well_ids:
                    formation_well_ids = list(set(formation_well_ids) & set(nearby_well_ids))
        else:
            self._report_progress(
                progress_callback, "graph",
                "No formation named - graph expansion limited to well relationships",
            )
        
        target_well_ids = formation_well_ids or nearby_well_ids
        
        # With no coordinates there is no spatial filter, so the wells reached
        # through the formation graph are the closest thing to "nearby" wells.
        if not ctx.nearby_wells and formation_well_ids:
            graph_wells = self._store_call(
                ctx, "supabase",
                lambda: self.repos["wells"].get_wells_by_ids(formation_well_ids),
                [],
            ) or []
            ctx.nearby_wells = graph_wells
            self._report_progress(
                progress_callback, "graph",
                f"No coordinates given - reporting the {len(graph_wells)} well(s) in {parsed.formation}",
            )
        
        # Stage 4: Depth filtering - events in depth range
        if target_well_ids and parsed.formation_id:
            depth_from = parsed.depth_from or 0
            depth_to = parsed.depth_to or 99999
            self._report_progress(
                progress_callback, "structured",
                f"Loading historical events between {depth_from:.0f}-{depth_to:.0f} m",
            )
            events = self._store_call(
                ctx, "supabase",
                lambda: self.repos["events"].get_events_by_formation_depth(
                    parsed.formation_id, depth_from, depth_to,
                    event_types=parsed.event_types if parsed.event_types else None,
                    well_ids=target_well_ids,
                ),
                [],
            ) or []
            
            # Enrich with graph context
            for event in events:
                entity_id = event.get("graphify_entity_id") or ""
                event["graph_context"] = self._store_call(
                    ctx, "graph",
                    lambda eid=entity_id: self.graph.expand_event_context(eid),
                    {},
                ) or {}
                # Distance from the active well, used later for spatial ranking
                if parsed.latitude is not None and parsed.longitude is not None:
                    event_lat = event.get("surface_latitude")
                    event_lon = event.get("surface_longitude")
                    if event_lat is not None and event_lon is not None:
                        event["distance_km"] = round(haversine_km(
                            parsed.latitude, parsed.longitude,
                            float(event_lat), float(event_lon),
                        ), 3)
            
            ctx.historical_events = events
        else:
            self._report_progress(
                progress_callback, "structured",
                "No wells and formation resolved - event lookup skipped",
            )
        
        # Stage 5: Semantic search in ChromaDB
        if parsed.formation:
            self._report_progress(progress_callback, "semantic", "Searching local vector store in ChromaDB")
            chroma_filter = build_metadata_filter(
                formation_id=parsed.formation_id,
                event_type=parsed.event_types[0] if parsed.event_types else None,
                depth_from=parsed.depth_from,
                depth_to=parsed.depth_to
            )
            semantic_results = self._store_call(
                ctx, "chromadb",
                lambda: self.chromadb.search_event_knowledge(
                    query=f"historical drilling problems {parsed.formation} depth {parsed.depth_from}-{parsed.depth_to}",
                    n_results=top_k,
                    where=chroma_filter,
                ),
                {},
            ) or {}
            chunk_results = self._store_call(
                ctx, "chromadb",
                lambda: self.chromadb.search_document_chunks(
                    query=parsed.raw_query,
                    n_results=top_k,
                    where=chroma_filter,
                ),
                {},
            ) or {}
            ctx.source_documents = semantic_results.get("results", []) + chunk_results.get("results", [])
            self._report_progress(
                progress_callback, "semantic",
                f"{len(ctx.source_documents)} semantic match(es) retrieved",
            )
        else:
            self._report_progress(
                progress_callback, "semantic",
                "No formation filter - semantic retrieval not scoped",
            )
        
        # Stage 6: Get lessons learned
        if parsed.formation_id:
            self._report_progress(progress_callback, "structured", "Loading lessons learned")
            lessons = self._store_call(
                ctx, "supabase",
                lambda: self.repos["lessons"].get_lessons_by_formation(parsed.formation_id),
                [],
            ) or []
            ctx.lessons = lessons
        
        # Stage 7: Re-rank results
        self._report_progress(progress_callback, "ranking", "Fusing and re-ranking evidence")
        ctx.historical_events = self._rerank_events(ctx.historical_events, parsed)
        
        return ctx
    
    def _retrieve_formation_knowledge(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Retrieve formation-specific knowledge"""
        ctx = self._new_context(parsed)
        
        if parsed.formation:
            # Get formation details
            self._report_progress(progress_callback, "structured", "Loading formation from the structured store")
            formation = self._store_call(
                ctx, "supabase",
                lambda: self.repos["formations"].get_formation_by_code(parsed.formation),
            )
            if formation:
                ctx.formations.append(formation)
                parsed.formation_id = formation["id"]
            
            # Get risk profile from graph
            self._report_progress(progress_callback, "graph", f"Expanding graph for {parsed.formation}")
            risk_profile = self._store_call(
                ctx, "graph",
                lambda: self.graph.get_formation_risk_profile(parsed.formation),
                {},
            ) or {}
            if risk_profile:
                ctx.formations.append(risk_profile)
            
            # Get lessons
            if parsed.formation_id:
                self._report_progress(progress_callback, "structured", "Loading formation lessons")
                lessons = self._store_call(
                    ctx, "supabase",
                    lambda: self.repos["lessons"].get_lessons_by_formation(parsed.formation_id),
                    [],
                ) or []
                ctx.lessons = lessons
            
            # Semantic search
            self._report_progress(progress_callback, "semantic", "Searching formation vectors in ChromaDB")
            chroma_results = self._store_call(
                ctx, "chromadb",
                lambda: self.chromadb.search_formation_knowledge(
                    query=parsed.raw_query,
                    n_results=top_k,
                    where=build_metadata_filter(formation_id=parsed.formation_id),
                ),
                {},
            ) or {}
            ctx.source_documents = chroma_results.get("results", [])
        
        self._report_progress(progress_callback, "ranking", "Ranking formation knowledge")
        return ctx
    
    def _retrieve_well_summary(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Retrieve well summary"""
        ctx = self._new_context(parsed)
        
        if parsed.well_id:
            self._report_progress(progress_callback, "structured", "Loading well record from the structured store")
            well = self._store_call(ctx, "supabase", lambda: self.repos["wells"].get_well(parsed.well_id))
            if well:
                ctx.active_well = well
                
                # Get offset well summary from graph
                self._report_progress(progress_callback, "graph", "Expanding offset-well relationships")
                entity_id = well.get("graphify_entity_id") or ""
                offset_summary = self._store_call(
                    ctx, "graph",
                    lambda: self.graph.get_offset_well_summary(entity_id),
                    {},
                ) or {}
                ctx.active_well["graph_summary"] = offset_summary
        
        self._report_progress(progress_callback, "ranking", "Ranking well context")
        return ctx
    
    def _retrieve_lessons(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Retrieve lessons learned"""
        ctx = self._new_context(parsed)
        
        # Report the structured stage whenever SQL is actually queried, so the
        # UI never shows the store as unused while a repository call is running.
        if parsed.formation_id or parsed.event_types:
            if parsed.formation_id:
                self._report_progress(progress_callback, "structured", "Loading formation lessons from the structured store")
            else:
                self._report_progress(progress_callback, "structured", "Loading lessons by event type from the structured store")

        if parsed.formation_id:
            lessons = self._store_call(
                ctx, "supabase",
                lambda: self.repos["lessons"].get_lessons_by_formation(parsed.formation_id),
                [],
            ) or []
            ctx.lessons.extend(lessons)
        
        if parsed.event_types:
            for et in parsed.event_types:
                more = self._store_call(
                    ctx, "supabase",
                    lambda e=et: self.repos["lessons"].get_lessons_by_event_type(e),
                    [],
                ) or []
                ctx.lessons.extend(more)
        
        # Semantic search for lessons
        self._report_progress(progress_callback, "semantic", "Searching lesson vectors in ChromaDB")
        chroma_results = self._store_call(
            ctx, "chromadb",
            lambda: self.chromadb.search_lessons_learned(
                query=parsed.raw_query,
                n_results=top_k,
                where=build_metadata_filter(
                    formation_id=parsed.formation_id,
                    event_type=parsed.event_types[0] if parsed.event_types else None,
                ),
            ),
            {},
        ) or {}
        ctx.source_documents = chroma_results.get("results", [])
        
        self._report_progress(progress_callback, "ranking", "Ranking lessons learned")
        return ctx
    
    def _retrieve_risk_assessment(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Retrieve risk assessment for current context"""
        ctx = self._new_context(parsed)
        
        # Get current well context
        if parsed.active_well_id:
            self._report_progress(progress_callback, "structured", "Loading active well from the structured store")
            ctx.active_well = self._store_call(
                ctx, "supabase", lambda: self.repos["wells"].get_well(parsed.active_well_id)
            ) or {}
        
        # Get formation risk profile
        if parsed.formation:
            self._report_progress(progress_callback, "graph", f"Expanding risk graph for {parsed.formation}")
            risk_profile = self._store_call(
                ctx, "graph",
                lambda: self.graph.get_formation_risk_profile(parsed.formation),
                {},
            ) or {}
            if risk_profile:
                ctx.formations.append(risk_profile)
                ctx.risk_patterns = risk_profile.get("risks", [])
        
        # Get historical analogues
        if parsed.formation and parsed.current_depth:
            self._report_progress(progress_callback, "graph", "Matching historical analogue wells")
            analogues = self._store_call(
                ctx, "graph",
                lambda: self.graph.find_historical_analogues(
                    parsed.formation,
                    parsed.current_depth - 50,
                    parsed.current_depth + 50,
                    lat=parsed.latitude,
                    lon=parsed.longitude,
                    radius_km=parsed.radius_km,
                ),
                [],
            ) or []
            ctx.historical_events = analogues
        
        self._report_progress(progress_callback, "ranking", "Scoring risk")
        return ctx
    
    def _retrieve_analogues(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Find analogue wells"""
        return self._retrieve_offset_events(parsed, top_k, progress_callback)
    
    def _retrieve_real_time_context(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """Real-time contextual retrieval for active drilling"""
        ctx = self._new_context(parsed)
        
        # This would integrate with eRTMAC streaming data
        # For now, return formation knowledge + recent events
        if parsed.current_formation:
            parsed.formation = parsed.current_formation
            return self._retrieve_risk_assessment(parsed, top_k, progress_callback)
        
        return ctx
    
    def _retrieve_general(self, parsed: ParsedQuery, top_k: int, progress_callback=None) -> ContextPackage:
        """General semantic search"""
        ctx = self._new_context(parsed)
        
        # Search all ChromaDB collections
        self._report_progress(progress_callback, "semantic", "Searching document, event, lesson, and formation vectors")
        for collection_name in [CollectionName.DOCUMENT_CHUNKS, CollectionName.EVENT_KNOWLEDGE,
                                CollectionName.LESSONS_LEARNED, CollectionName.FORMATION_KNOWLEDGE]:
            results = self._store_call(
                ctx, "chromadb",
                lambda name=collection_name: self.chromadb.get_collection(name).query(
                    query_texts=[parsed.raw_query],
                    n_results=max(1, top_k // 4),
                ),
                {},
            ) or {}
            documents = results.get("documents") or [[]]
            metadatas = results.get("metadatas") or [[]]
            distances = results.get("distances") or [[]]
            for rank, text in enumerate(documents[0] if documents else []):
                ctx.source_documents.append({
                    "collection": collection_name,
                    "text": text,
                    "metadata": metadatas[0][rank] if metadatas and rank < len(metadatas[0]) else {},
                    "distance": distances[0][rank] if distances and rank < len(distances[0]) else None,
                })
        
        self._report_progress(progress_callback, "ranking", "Ranking semantic matches")
        ctx.source_documents.sort(
            key=lambda d: d.get("distance") if d.get("distance") is not None else float("inf")
        )
        return ctx
    
    def _rerank_events(self, events: List[Dict], parsed: ParsedQuery) -> List[Dict]:
        """Re-rank events based on relevance"""
        for event in events:
            score = 0.0
            
            # Geographic similarity (only when a position was actually available)
            distance_km = event.get("distance_km")
            if distance_km is not None:
                score += max(0, 1.0 - distance_km / (parsed.radius_km or 5.0)) * settings.retrieval.weight_spatial
            
            # Formation similarity
            if parsed.formation_id and event.get("formation_id") == parsed.formation_id:
                score += settings.retrieval.weight_graph
            
            # Depth similarity - the event counts when its interval overlaps the
            # requested range, which is what a driller means by "around 3200 m".
            event_from = event.get("depth_from_md")
            event_to = event.get("depth_to_md")
            if parsed.depth_from is not None and parsed.depth_to is not None and event_from is not None:
                event_to = event_to if event_to is not None else event_from
                if event_from <= parsed.depth_to and event_to >= parsed.depth_from:
                    score += settings.retrieval.weight_depth
            
            # Event type similarity
            if parsed.event_types and event.get("event_type") in parsed.event_types:
                score += settings.retrieval.weight_vector
            
            # Data confidence
            score += event.get("confidence", 0.5) * 0.1
            
            event["relevance_score"] = score
        
        return sorted(events, key=lambda x: x.get("relevance_score", 0), reverse=True)


# =============================================================================
# REAL-TIME RETRIEVAL
# =============================================================================

class RealTimeRetrievalEngine:
    """Real-time retrieval for eRTMAC integration"""
    
    def __init__(self):
        self.hybrid_engine = HybridRetrievalEngine()
        self.supabase = self.hybrid_engine.supabase
        self.repos = self.hybrid_engine.repos
    
    def process_real_time_data(self, well_id: str, current_data: Dict) -> ContextPackage:
        """Process real-time eRTMAC data and retrieve historical context"""
        # Extract current state
        current_depth = current_data.get("depth", 0)
        current_formation = current_data.get("formation")
        
        # Get well info
        well = self.repos["wells"].get_well(well_id)
        if not well:
            return self._new_context(parsed)
        
        latitude = well.get("surface_latitude")
        longitude = well.get("surface_longitude")
        
        # Build context for retrieval
        context = {
            "active_well_id": well_id,
            "well_code": well.get("well_code"),
            "latitude": latitude,
            "longitude": longitude,
            "current_depth": current_depth,
            "current_formation": current_formation,
            "radius_km": settings.retrieval.default_search_radius_km,
        }
        
        # Query for historical analogues
        query = f"historical drilling events similar to current conditions at {current_depth}m in {current_formation}"
        
        return self.hybrid_engine.retrieve(query, context)
    
    def generate_alert(self, context_package: ContextPackage, current_data: Dict) -> Optional[Dict]:
        """Generate alert based on historical analogues"""
        if not context_package.historical_events:
            return None
        
        # Check for concerning patterns
        stuck_pipe_events = [e for e in context_package.historical_events 
                           if e.get("event_type") == "STUCK_PIPE"]
        mud_loss_events = [e for e in context_package.historical_events 
                         if e.get("event_type") == "MUD_LOSS"]
        
        alert = None
        if stuck_pipe_events:
            nearest = min(stuck_pipe_events, key=lambda x: x.get("distance_km", 999))
            alert = {
                "type": "HISTORICAL_ANALOGUE_ALERT",
                "severity": "WARNING",
                "title": "Historical Stuck Pipe Analogues Detected",
                "description": f"Found {len(stuck_pipe_events)} historical stuck pipe events in nearby wells",
                "current_depth": current_data.get("depth"),
                "current_formation": current_data.get("formation"),
                "nearest_analogue": nearest.get("well_code"),
                "analogue_depth": nearest.get("depth_from_md"),
                "historical_mitigation": nearest.get("mitigation_applied"),
                "evidence_documents": nearest.get("graph_context", {}).get("documents", []),
                "risk_score": 0.7
            }
        elif mud_loss_events:
            nearest = min(mud_loss_events, key=lambda x: x.get("distance_km", 999))
            alert = {
                "type": "HISTORICAL_ANALOGUE_ALERT",
                "severity": "INFO",
                "title": "Historical Mud Loss Analogues Detected",
                "description": f"Found {len(mud_loss_events)} historical mud loss events in nearby wells",
                "current_depth": current_data.get("depth"),
                "current_formation": current_data.get("formation"),
                "nearest_analogue": nearest.get("well_code"),
                "analogue_depth": nearest.get("depth_from_md"),
                "historical_mitigation": nearest.get("mitigation_applied"),
                "evidence_documents": nearest.get("graph_context", {}).get("documents", []),
                "risk_score": 0.5
            }
        
        if alert:
            # Save alert to Supabase
            alert_data = {
                "alert_code": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "well_id": context_package.active_well.get("id"),
                "alert_type": "historical_analogue",
                "severity": alert["severity"],
                "title": alert["title"],
                "description": alert["description"],
                "current_depth_md": alert["current_depth"],
                "current_formation_id": None,  # Would need to resolve
                "analogue_wells": [a.get("well_id") for a in context_package.historical_events[:5]],
                "historical_events": [e.get("id") for e in context_package.historical_events[:10]],
                "risk_score": alert["risk_score"],
                "recommendation": alert.get("historical_mitigation"),
                "status": "ACTIVE"
            }
            self.repos["alerts"].create_alert(alert_data)
        
        return alert


# Global instances
_retrieval_engine: Optional[HybridRetrievalEngine] = None
_realtime_engine: Optional[RealTimeRetrievalEngine] = None


def get_retrieval_engine() -> HybridRetrievalEngine:
    global _retrieval_engine
    if _retrieval_engine is None:
        _retrieval_engine = HybridRetrievalEngine()
    return _retrieval_engine


def get_realtime_engine() -> RealTimeRetrievalEngine:
    global _realtime_engine
    if _realtime_engine is None:
        _realtime_engine = RealTimeRetrievalEngine()
    return _realtime_engine