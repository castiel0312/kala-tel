"""NLP and Entity Extraction for NWIS"""
import spacy
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging

from src.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# ENTITY TYPES
# =============================================================================

class EntityType(Enum):
    WELL = "WELL"
    FORMATION = "FORMATION"
    DEPTH = "DEPTH"
    DATE = "DATE"
    EVENT_TYPE = "EVENT_TYPE"
    EQUIPMENT = "EQUIPMENT"
    CHEMICAL = "CHEMICAL"
    MEASUREMENT = "MEASUREMENT"
    LOCATION = "LOCATION"
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    RISK = "RISK"
    MITIGATION = "MITIGATION"
    CAUSE = "CAUSE"
    CONSEQUENCE = "CONSEQUENCE"
    LESSON = "LESSON"


@dataclass
class ExtractedEntity:
    text: str
    label: EntityType
    start_char: int
    end_char: int
    confidence: float
    normalized_value: Optional[str] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class ExtractedRelation:
    subject: ExtractedEntity
    predicate: str
    object: ExtractedEntity
    confidence: float
    context: str = ""


@dataclass
class ExtractedEvent:
    event_type: str
    depth_from: Optional[float] = None
    depth_to: Optional[float] = None
    formation: Optional[str] = None
    severity: Optional[str] = None
    cause: Optional[str] = None
    consequence: Optional[str] = None
    mitigation: Optional[str] = None
    outcome: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    confidence: float = 0.0
    source_text: str = ""


# =============================================================================
# PATTERN DEFINITIONS
# =============================================================================

# Drilling event patterns
EVENT_PATTERNS = {
    "MUD_LOSS": [
        r"(?i)mud loss(?:es)?",
        r"(?i)lost circulation",
        r"(?i)loss(?:es)?\s+(?:of\s+)?(?:mud|circulation)",
        r"(?i)total loss",
        r"(?i)severe\s+loss",
    ],
    "KICK": [
        r"(?i)kick",
        r"(?i)well control",
        r"(?i)influx",
        r"(?i)gas influx",
    ],
    "STUCK_PIPE": [
        r"(?i)stuck pipe",
        r"(?i)pipe stuck",
        r"(?i)differential sticking",
        r"(?i)mechanical sticking",
        r"(?i)key seating",
    ],
    "PACK_OFF": [
        r"(?i)pack.?off",
        r"(?i)packoff",
    ],
    "TORQUE_SPIKE": [
        r"(?i)torque spike",
        r"(?i)high torque",
        r"(?i)torque increase",
    ],
    "PRESSURE_SPIKE": [
        r"(?i)pressure spike",
        r"(?i)pressure surge",
        r"(?i)standpipe pressure",
    ],
    "WELLBORE_INSTABILITY": [
        r"(?i)wellbore instability",
        r"(?i)hole instability",
        r"(?i)caving",
        r"(?i)sloughing",
    ],
    "FISHING": [
        r"(?i)fishing",
        r"(?i)fish recovery",
        r"(?i)junk retrieval",
    ],
    "CEMENT_FAILURE": [
        r"(?i)cement failure",
        r"(?i)poor cement",
        r"(?i)channeling",
        r"(?i)microannulus",
    ],
}

# Depth patterns
DEPTH_PATTERNS = [
    r'(?i)(?:at|depth|md|tvd)\s*(?:of\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:m|ft|meters?|feet)',
    r'(?i)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:m|ft|meters?|feet)\s*(?:md|tvd|measured depth|true vertical depth)',
    r'(?i)depth\s*[=:]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)',
]

# Formation patterns
FORMATION_PATTERNS = [
    r'(?i)formation\s+([A-Z][A-Z0-9\-]+)',
    r'(?i)fm\.?\s+([A-Z][A-Z0-9\-]+)',
    r'(?i)the\s+([A-Z][A-Z0-9\-]+)\s+formation',
    r'(?i)([A-Z][A-Z0-9\-]+)\s+(?:formation|member|zone)',
]

# Well patterns
WELL_PATTERNS = [
    r'(?i)well\s+(?:#|no\.?|number)?\s*([A-Z0-9\-]+)',
    r'(?i)(?:well|w)\-([A-Z0-9\-]+)',
    r'(?i)([A-Z]{2,4}\-\d{2,4})',
]

# Severity patterns
SEVERITY_PATTERNS = {
    "LOW": [r"(?i)minor", r"(?i)slight", r"(?i)low"],
    "MEDIUM": [r"(?i)moderate", r"(?i)medium"],
    "HIGH": [r"(?i)major", r"(?i)significant", r"(?i)high"],
    "SEVERE": [r"(?i)severe", r"(?i)serious", r"(?i)critical"],
    "CRITICAL": [r"(?i)catastrophic", r"(?i)disaster"],
}

# Mitigation patterns
MITIGATION_PATTERNS = [
    r"(?i)lcm treatment",
    r"(?i)lost circulation material",
    r"(?i)cement plug",
    r"(?i)plug back",
    r"(?i)ream",
    r"(?i)wash over",
    r"(?i)jar",
    r"(?i)circulate",
    r"(?i)condition mud",
    r"(?i)weight up",
    r"(?i)kill mud",
    r"(?i)bullhead",
]


# =============================================================================
# NLP PROCESSOR
# =============================================================================

class NLPEngine:
    """NLP engine for entity extraction and event detection"""
    
    def __init__(self):
        self.nlp = None
        self._load_model()
        self._compile_patterns()
    
    def _load_model(self):
        """Load spaCy model"""
        try:
            self.nlp = spacy.load(settings.nlp.spacy_model)
            logger.info(f"Loaded spaCy model: {settings.nlp.spacy_model}")
        except OSError:
            logger.warning(f"Model {settings.nlp.spacy_model} not found, using en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
        
        # Add custom entity ruler
        ruler = self.nlp.add_pipe("entity_ruler", before="ner", config={"overwrite_ents": True})
        ruler.add_patterns(self._get_custom_patterns())
    
    def _compile_patterns(self):
        """Compile regex patterns"""
        self.event_patterns = {k: [re.compile(p, re.IGNORECASE) for p in v] 
                              for k, v in EVENT_PATTERNS.items()}
        self.depth_patterns = [re.compile(p, re.IGNORECASE) for p in DEPTH_PATTERNS]
        self.formation_patterns = [re.compile(p, re.IGNORECASE) for p in FORMATION_PATTERNS]
        self.well_patterns = [re.compile(p, re.IGNORECASE) for p in WELL_PATTERNS]
        self.severity_patterns = {k: [re.compile(p, re.IGNORECASE) for p in v] 
                                 for k, v in SEVERITY_PATTERNS.items()}
        self.mitigation_patterns = [re.compile(p, re.IGNORECASE) for p in MITIGATION_PATTERNS]
    
    def _get_custom_patterns(self) -> List[Dict]:
        """Get custom entity patterns for spaCy"""
        patterns = []
        
        # Well patterns
        patterns.append({"label": "WELL", "pattern": [{"LOWER": "well"}, {"TEXT": {"REGEX": r"[A-Z0-9\-]+"}}]})
        patterns.append({"label": "WELL", "pattern": [{"LOWER": "well"}, {"LOWER": "#"}, {"TEXT": {"REGEX": r"[A-Z0-9\-]+"}}]})
        
        # Formation patterns
        patterns.append({"label": "FORMATION", "pattern": [{"LOWER": "formation"}, {"TEXT": {"REGEX": r"[A-Z][A-Z0-9\-]+"}}]})
        patterns.append({"label": "FORMATION", "pattern": [{"LOWER": "fm"}, {"TEXT": {"REGEX": r"[A-Z][A-Z0-9\-]+"}}]})
        
        # Depth patterns
        patterns.append({"label": "DEPTH", "pattern": [{"TEXT": {"REGEX": r"\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?[MF]"}}]})
        patterns.append({"label": "DEPTH", "pattern": [
            {"LOWER": "at"}, {"TEXT": {"REGEX": r"\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?"}}, {"LOWER": {"IN": ["m", "ft", "meters", "feet"]}}
        ]})
        
        return patterns
    
    def extract_entities(self, text: str) -> List[ExtractedEntity]:
        """Extract entities from text"""
        doc = self.nlp(text)
        entities = []
        
        for ent in doc.ents:
            label = self._map_spacy_label(ent.label_)
            if label:
                entities.append(ExtractedEntity(
                    text=ent.text,
                    label=label,
                    start_char=ent.start_char,
                    end_char=ent.end_char,
                    confidence=0.85,  # Default confidence for spaCy entities
                ))
        
        # Also extract using regex patterns for specific types
        entities.extend(self._extract_depths(text))
        entities.extend(self._extract_formations(text))
        entities.extend(self._extract_wells(text))
        entities.extend(self._extract_events(text))
        
        return entities
    
    def _map_spacy_label(self, label: str) -> Optional[EntityType]:
        """Map spaCy labels to our entity types"""
        mapping = {
            "ORG": EntityType.ORGANIZATION,
            "PERSON": EntityType.PERSON,
            "GPE": EntityType.LOCATION,
            "LOC": EntityType.LOCATION,
            "DATE": EntityType.DATE,
            "TIME": EntityType.DATE,
            "MONEY": EntityType.MEASUREMENT,
            "PERCENT": EntityType.MEASUREMENT,
            "QUANTITY": EntityType.MEASUREMENT,
            "CARDINAL": EntityType.MEASUREMENT,
        }
        return mapping.get(label)
    
    def _extract_depths(self, text: str) -> List[ExtractedEntity]:
        """Extract depth measurements"""
        entities = []
        for pattern in self.depth_patterns:
            for match in pattern.finditer(text):
                try:
                    value = float(match.group(1).replace(',', ''))
                    entities.append(ExtractedEntity(
                        text=match.group(0),
                        label=EntityType.DEPTH,
                        start_char=match.start(),
                        end_char=match.end(),
                        confidence=0.9,
                        normalized_value=str(value),
                        metadata={"unit": "m", "value": value}
                    ))
                except (ValueError, IndexError):
                    pass
        return entities
    
    def _extract_formations(self, text: str) -> List[ExtractedEntity]:
        """Extract formation names"""
        entities = []
        for pattern in self.formation_patterns:
            for match in pattern.finditer(text):
                entities.append(ExtractedEntity(
                    text=match.group(0),
                    label=EntityType.FORMATION,
                    start_char=match.start(),
                    end_char=match.end(),
                    confidence=0.85,
                    normalized_value=match.group(1) if match.groups() else match.group(0),
                ))
        return entities
    
    def _extract_wells(self, text: str) -> List[ExtractedEntity]:
        """Extract well names"""
        entities = []
        for pattern in self.well_patterns:
            for match in pattern.finditer(text):
                entities.append(ExtractedEntity(
                    text=match.group(0),
                    label=EntityType.WELL,
                    start_char=match.start(),
                    end_char=match.end(),
                    confidence=0.85,
                    normalized_value=match.group(1) if match.groups() else match.group(0),
                ))
        return entities
    
    def _extract_events(self, text: str) -> List[ExtractedEntity]:
        """Extract drilling event mentions"""
        entities = []
        for event_type, patterns in self.event_patterns.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    entities.append(ExtractedEntity(
                        text=match.group(0),
                        label=EntityType.EVENT_TYPE,
                        start_char=match.start(),
                        end_char=match.end(),
                        confidence=0.9,
                        normalized_value=event_type,
                        metadata={"event_type": event_type}
                    ))
        return entities
    
    def extract_events(self, text: str, entities: List[ExtractedEntity] = None) -> List[ExtractedEvent]:
        """Extract structured events from text"""
        if entities is None:
            entities = self.extract_entities(text)
        
        events = []
        sentences = self._split_sentences(text)
        
        for sentence in sentences:
            sent_entities = [e for e in entities if e.start_char >= sentence["start"] and e.end_char <= sentence["end"]]
            event = self._extract_event_from_sentence(sentence["text"], sent_entities)
            if event:
                events.append(event)
        
        return events
    
    def _split_sentences(self, text: str) -> List[Dict]:
        """Split text into sentences with position info"""
        doc = self.nlp(text)
        return [{"text": sent.text, "start": sent.start_char, "end": sent.end_char} 
                for sent in doc.sents]
    
    def _extract_event_from_sentence(self, sentence: str, entities: List[ExtractedEntity]) -> Optional[ExtractedEvent]:
        """Extract event from a sentence"""
        # Find event type
        event_type = None
        for ent in entities:
            if ent.label == EntityType.EVENT_TYPE:
                event_type = ent.normalized_value
                break
        
        if not event_type:
            return None
        
        # Extract other attributes
        depth_from = None
        depth_to = None
        formation = None
        severity = "MEDIUM"
        
        for ent in entities:
            if ent.label == EntityType.DEPTH and ent.metadata.get("value"):
                if depth_from is None:
                    depth_from = ent.metadata["value"]
                else:
                    depth_to = ent.metadata["value"]
            elif ent.label == EntityType.FORMATION:
                formation = ent.normalized_value
        
        # Extract severity
        for sev, patterns in self.severity_patterns.items():
            if any(p.search(sentence) for p in patterns):
                severity = sev
                break
        
        # Extract mitigation
        mitigation = None
        for pattern in self.mitigation_patterns:
            match = pattern.search(sentence)
            if match:
                mitigation = match.group(0)
                break
        
        # Calculate confidence based on extracted attributes
        confidence = 0.5
        if depth_from:
            confidence += 0.15
        if formation:
            confidence += 0.15
        if mitigation:
            confidence += 0.1
        if severity != "MEDIUM":
            confidence += 0.1
        
        return ExtractedEvent(
            event_type=event_type,
            depth_from=depth_from,
            depth_to=depth_to,
            formation=formation,
            severity=severity,
            mitigation=mitigation,
            confidence=min(confidence, 1.0),
            source_text=sentence
        )
    
    def extract_relations(self, text: str, entities: List[ExtractedEntity]) -> List[ExtractedRelation]:
        """Extract relations between entities"""
        relations = []
        doc = self.nlp(text)
        
        # Simple dependency-based relation extraction
        for ent1 in entities:
            for ent2 in entities:
                if ent1 == ent2:
                    continue
                
                # Check if entities are close in text
                if abs(ent1.start_char - ent2.end_char) < 100 or abs(ent2.start_char - ent1.end_char) < 100:
                    # Get text between them
                    start = min(ent1.start_char, ent2.start_char)
                    end = max(ent1.end_char, ent2.end_char)
                    context = text[start:end]
                    
                    # Determine relation type
                    relation = self._classify_relation(ent1, ent2, context)
                    if relation:
                        relations.append(ExtractedRelation(
                            subject=ent1,
                            predicate=relation,
                            object=ent2,
                            confidence=0.7,
                            context=context
                        ))
        
        return relations
    
    def _classify_relation(self, ent1: ExtractedEntity, ent2: ExtractedEntity, context: str) -> Optional[str]:
        """Classify relation between two entities"""
        context_lower = context.lower()
        
        # Event -> Formation
        if ent1.label == EntityType.EVENT_TYPE and ent2.label == EntityType.FORMATION:
            return "OCCURRED_IN"
        if ent1.label == EntityType.FORMATION and ent2.label == EntityType.EVENT_TYPE:
            return "OCCURRED_IN"
        
        # Event -> Depth
        if ent1.label == EntityType.EVENT_TYPE and ent2.label == EntityType.DEPTH:
            return "OCCURRED_AT"
        if ent1.label == EntityType.DEPTH and ent2.label == EntityType.EVENT_TYPE:
            return "OCCURRED_AT"
        
        # Well -> Event
        if ent1.label == EntityType.WELL and ent2.label == EntityType.EVENT_TYPE:
            return "EXPERIENCED"
        if ent1.label == EntityType.EVENT_TYPE and ent2.label == EntityType.WELL:
            return "EXPERIENCED"
        
        # Event -> Mitigation
        if ent1.label == EntityType.EVENT_TYPE and "mitigation" in context_lower:
            return "MITIGATED_BY"
        if ent2.label == EntityType.EVENT_TYPE and "mitigation" in context_lower:
            return "MITIGATED_BY"
        
        # Cause -> Event
        if "caused by" in context_lower or "due to" in context_lower:
            return "CAUSED_BY"
        
        return None


# =============================================================================
# ENTITY RESOLUTION
# =============================================================================

class EntityResolver:
    """Resolve entities to canonical forms"""
    
    def __init__(self):
        self.well_aliases = {}
        self.formation_aliases = {}
        self._load_aliases()
    
    def _load_aliases(self):
        """Load known aliases from configuration or database"""
        # Well aliases
        self.well_aliases = {
            "well 42": "WELL-042",
            "oil-42": "WELL-042",
            "oil_042": "WELL-042",
            "042": "WELL-042",
            "abc-42": "WELL-042",
        }
        
        # Formation aliases
        self.formation_aliases = {
            "formation x": "FORMATION-X",
            "fm-x": "FORMATION-X",
            "f.x": "FORMATION-X",
            "formation-x": "FORMATION-X",
        }
    
    def resolve_well(self, well_name: str) -> str:
        """Resolve well name to canonical ID"""
        normalized = well_name.lower().strip()
        return self.well_aliases.get(normalized, well_name.upper())
    
    def resolve_formation(self, formation_name: str) -> str:
        """Resolve formation name to canonical ID"""
        normalized = formation_name.lower().strip()
        return self.formation_aliases.get(normalized, formation_name.upper())
    
    def add_well_alias(self, alias: str, canonical: str):
        """Add a well alias"""
        self.well_aliases[alias.lower().strip()] = canonical
    
    def add_formation_alias(self, alias: str, canonical: str):
        """Add a formation alias"""
        self.formation_aliases[alias.lower().strip()] = canonical


# =============================================================================
# UNIT NORMALIZATION
# =============================================================================

class UnitNormalizer:
    """Normalize units to standard SI"""
    
    UNIT_CONVERSIONS = {
        "ft": ("m", 0.3048),
        "feet": ("m", 0.3048),
        "m": ("m", 1.0),
        "meters": ("m", 1.0),
        "metres": ("m", 1.0),
        "ppg": ("kg/m3", 119.826),
        "lb/gal": ("kg/m3", 119.826),
        "sg": ("kg/m3", 1000.0),
        "psi": ("kPa", 6.89476),
        "bar": ("kPa", 100.0),
        "kpa": ("kPa", 1.0),
        "degc": ("°C", 1.0),
        "degf": ("°C", 5.0/9.0),  # Need offset too
        "c": ("°C", 1.0),
        "f": ("°C", 5.0/9.0),
    }
    
    def normalize_depth(self, value: float, unit: str) -> Tuple[float, str]:
        """Normalize depth to meters"""
        unit = unit.lower().strip()
        if unit in self.UNIT_CONVERSIONS:
            target_unit, factor = self.UNIT_CONVERSIONS[unit]
            if unit in ["degf", "f"]:
                # Special handling for Fahrenheit
                return (value - 32) * factor, target_unit
            return value * factor, target_unit
        return value, "m"
    
    def normalize_density(self, value: float, unit: str) -> Tuple[float, str]:
        """Normalize density to kg/m3"""
        unit = unit.lower().strip()
        if unit in self.UNIT_CONVERSIONS:
            target_unit, factor = self.UNIT_CONVERSIONS[unit]
            return value * factor, target_unit
        return value, "kg/m3"
    
    def normalize_pressure(self, value: float, unit: str) -> Tuple[float, str]:
        """Normalize pressure to kPa"""
        unit = unit.lower().strip()
        if unit in self.UNIT_CONVERSIONS:
            target_unit, factor = self.UNIT_CONVERSIONS[unit]
            return value * factor, target_unit
        return value, "kPa"


# Global instances
_nlp_engine: Optional[NLPEngine] = None
_entity_resolver: Optional[EntityResolver] = None
_unit_normalizer: Optional[UnitNormalizer] = None


def get_nlp_engine() -> NLPEngine:
    global _nlp_engine
    if _nlp_engine is None:
        _nlp_engine = NLPEngine()
    return _nlp_engine


def get_entity_resolver() -> EntityResolver:
    global _entity_resolver
    if _entity_resolver is None:
        _entity_resolver = EntityResolver()
    return _entity_resolver


def get_unit_normalizer() -> UnitNormalizer:
    global _unit_normalizer
    if _unit_normalizer is None:
        _unit_normalizer = UnitNormalizer()
    return _unit_normalizer