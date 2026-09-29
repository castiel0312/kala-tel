"""FastAPI Application for NWIS"""
import asyncio
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import uuid
import shutil
from pathlib import Path
import logging
from datetime import datetime

from src.config.settings import get_settings
from src.ingestion.pipeline import ingest_document, IngestionResult
from src.retrieval.hybrid_engine import get_retrieval_engine, get_realtime_engine, ContextPackage
from src.models.supabase_schema import get_supabase_client, get_repositories

logger = logging.getLogger(__name__)
settings = get_settings()

# Create upload directory
UPLOAD_DIR = Path(settings.base_dir) / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="NWIS - Nearby Wells Intelligence System",
    description="AI/ML-enabled decision-support platform for drilling engineers",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def frontend():
    # The dashboard is edited in place during development, so never let the
    # browser serve a stale copy of the markup or its inline script.
    return FileResponse(
        Path(__file__).with_name("ui.html"),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class DocumentUploadRequest(BaseModel):
    document_type: str = Field(..., description="Type of document (WCR, DDR, MUD_REPORT, etc.)")
    well_id: Optional[str] = Field(None, description="Associated well ID")
    well_code: Optional[str] = Field(None, description="Associated well code")
    title: Optional[str] = Field(None, description="Document title")
    document_date: Optional[str] = Field(None, description="Document date (YYYY-MM-DD)")
    author: Optional[str] = Field(None, description="Document author")
    confidentiality: str = Field("INTERNAL", description="Confidentiality level")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TextUploadRequest(BaseModel):
    content: str = Field(..., description="Text content to ingest")
    document_type: str = Field(..., description="Type of document")
    well_id: Optional[str] = None
    well_code: Optional[str] = None
    title: Optional[str] = None
    document_date: Optional[str] = None
    author: Optional[str] = None
    confidentiality: str = "INTERNAL"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str = Field(..., description="Natural language query")
    context: Dict[str, Any] = Field(default_factory=dict)
    top_k: int = Field(20, description="Number of results to return")


class RealTimeDataRequest(BaseModel):
    well_id: str
    depth: float
    formation: Optional[str] = None
    torque: Optional[float] = None
    rop: Optional[float] = None
    spp: Optional[float] = None
    wob: Optional[float] = None
    rpm: Optional[float] = None
    flow_rate: Optional[float] = None
    mud_weight: Optional[float] = None
    timestamp: Optional[str] = None


class WellCreateRequest(BaseModel):
    well_code: str
    well_name: str
    well_type: str
    field_id: str
    latitude: float
    longitude: float
    total_depth_md: Optional[float] = None
    total_depth_tvd: Optional[float] = None
    status: str = "PLANNED"


class FormationCreateRequest(BaseModel):
    formation_code: str
    formation_name: str
    stratigraphic_unit: Optional[str] = None
    age: Optional[str] = None
    lithology: Optional[str] = None
    description: Optional[str] = None


class EventCreateRequest(BaseModel):
    well_id: str
    event_type: str
    event_code: str
    severity: str = "MEDIUM"
    depth_from_md: Optional[float] = None
    depth_to_md: Optional[float] = None
    formation_id: Optional[str] = None
    description: str = ""
    mitigation_applied: Optional[str] = None
    mitigation_outcome: Optional[str] = None


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "NWIS",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check - verifies all connections"""
    checks = {}
    
    # Structured SQL store (local SQLite by default, Supabase when configured)
    try:
        from src.models.local_sql import get_local_store
        from src.config.settings import get_settings as _get_settings
        if (_get_settings().sql.backend or "local").lower() == "supabase":
            supabase = get_supabase_client()
            supabase.table("wells").select("id").limit(1).execute()
            checks["sql"] = "connected"
        else:
            counts = get_local_store().counts()
            checks["sql"] = f"connected ({sum(counts.values())} rows)"
    except Exception as e:
        checks["sql"] = f"unavailable: {type(e).__name__}"
    
    # ChromaDB
    try:
        from src.models.chromadb_client import get_chromadb_client
        chromadb = get_chromadb_client()
        chromadb.client.heartbeat()
        checks["chromadb"] = "connected"
    except Exception as e:
        checks["chromadb"] = f"unavailable: {type(e).__name__}"
    
    # Knowledge graph: the offline local graph or Neo4j
    graph_backend = "unavailable"
    try:
        from src.models.graph_resolver import get_graph_backend, graph_health
        graph_client, backend = get_graph_backend()
        graph_backend = backend
        if backend == "local":
            stats = graph_client.stats()
            checks["graph"] = f"connected (offline graph: {stats['nodes']} nodes, {stats['relationships']} rels)"
        else:
            graph_client.execute_query("RETURN 1")
            checks["graph"] = f"connected ({backend})"
    except Exception as e:
        checks["graph"] = f"unavailable: {type(e).__name__}"
    
    all_healthy = all("unavailable" not in v and "error" not in v for v in checks.values())
    
    return {
        "ready": all_healthy,
        "graph_backend": graph_backend,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }


# =============================================================================
# DOCUMENT INGESTION ENDPOINTS
# =============================================================================

ALLOWED_UPLOAD_SUFFIXES = {".pdf", ".txt", ".md", ".csv", ".log", ".json"}


@app.post("/api/v1/documents/upload", response_model=IngestionResult)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    well_id: Optional[str] = Form(None),
    well_code: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    document_date: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    confidentiality: str = Form("INTERNAL")
):
    """Upload and ingest a PDF or text document"""

    # Validate file type
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix or 'unknown'}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_UPLOAD_SUFFIXES))}"
        )
    
    # Save file temporarily
    file_id = str(uuid.uuid4())
    temp_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Guard against empty uploads before doing expensive OCR/chunking
        if temp_path.stat().st_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Prepare metadata
        metadata = {
            "document_type": document_type,
            "well_id": well_id,
            "well_code": well_code,
            "title": title or file.filename,
            "document_date": document_date,
            "author": author,
            "confidentiality": confidentiality,
            "source_filename": file.filename,
        }
        
        # Ingest document (run in background for large files)
        result = ingest_document(str(temp_path), metadata)
        
        return result
        
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()


@app.post("/api/v1/documents/upload-text", response_model=IngestionResult)
async def upload_text_document(request: TextUploadRequest):
    """Ingest text content directly"""
    
    # Create temporary file
    file_id = str(uuid.uuid4())
    temp_path = UPLOAD_DIR / f"{file_id}.txt"
    
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            f.write(request.content)
        
        metadata = {
            "document_type": request.document_type,
            "well_id": request.well_id,
            "well_code": request.well_code,
            "title": request.title,
            "document_date": request.document_date,
            "author": request.author,
            "confidentiality": request.confidentiality,
        }
        
        result = ingest_document(str(temp_path), metadata)
        return result
        
    except Exception as e:
        logger.error(f"Text upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()


@app.get("/api/v1/documents/{document_id}")
async def get_document(document_id: str):
    """Get document details"""
    repos = get_repositories()
    
    doc = repos["documents"].get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get chunks
    chunks = repos["chunks"].get_chunks_by_document(document_id)
    doc["chunks"] = chunks
    
    return doc


@app.get("/api/v1/documents")
async def list_documents(
    well_id: Optional[str] = None,
    document_type: Optional[str] = None,
    limit: int = 50
):
    """List documents with optional filters"""
    repos = get_repositories()
    
    if well_id:
        docs = repos["documents"].get_documents_by_well(well_id, document_type)
    elif hasattr(repos["documents"], "list_documents"):
        # Local SQL backend supports an unfiltered listing
        docs = repos["documents"].list_documents()
    else:
        docs = []
    
    if document_type:
        docs = [doc for doc in docs if doc.get("document_type") == document_type]
    
    return {"documents": docs[:limit]}


# =============================================================================
# SEARCH & RETRIEVAL ENDPOINTS
# =============================================================================

@app.post("/api/v1/search")
async def search(request: SearchRequest):
    """Hybrid search across all data stores"""
    engine = get_retrieval_engine()
    
    try:
        context_package = engine.retrieve(request.query, request.context, request.top_k)
        return context_package
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/search/stream")
async def search_stream(request: SearchRequest):
    """Stream retrieval progress events followed by the search result."""
    loop = asyncio.get_running_loop()
    events = asyncio.Queue()

    def publish(event):
        loop.call_soon_threadsafe(events.put_nowait, event)

    def run_search():
        try:
            result = get_retrieval_engine().retrieve(
                request.query,
                request.context,
                request.top_k,
                progress_callback=lambda stage, message: publish({
                    "type": "progress",
                    "stage": stage,
                    "message": message,
                }),
            )
            publish({"type": "result", "data": jsonable_encoder(result)})
        except Exception as error:
            logger.error(f"Streaming search failed: {error}", exc_info=True)
            publish({"type": "error", "message": str(error)})

    async def stream_events():
        search_task = asyncio.create_task(asyncio.to_thread(run_search))
        while True:
            event = await events.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event["type"] in {"result", "error"}:
                break
        await search_task

    return StreamingResponse(
        stream_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/v1/search/nearby-wells")
async def search_nearby_wells(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    formation: Optional[str] = None,
    depth_from: Optional[float] = None,
    depth_to: Optional[float] = None,
    event_types: Optional[str] = None
):
    """Search for nearby wells with optional filters"""
    engine = get_retrieval_engine()
    
    context = {
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radius_km,
        "formation": formation,
        "depth_from": depth_from,
        "depth_to": depth_to,
    }
    
    if event_types:
        context["event_types"] = event_types.split(",")
    
    query = "Find nearby wells"
    if formation:
        query += f" that drilled through {formation}"
    if depth_from and depth_to:
        query += f" at depth {depth_from}-{depth_to}m"
    
    return engine.retrieve(query, context)


@app.get("/api/v1/search/formation/{formation_code}")
async def search_formation(formation_code: str):
    """Get comprehensive formation knowledge"""
    engine = get_retrieval_engine()
    
    query = f"Show all knowledge about formation {formation_code}"
    context = {"formation": formation_code}
    
    return engine.retrieve(query, context)


@app.get("/api/v1/search/well/{well_id}")
async def search_well(well_id: str):
    """Get well summary and history"""
    engine = get_retrieval_engine()
    
    query = f"Show summary for well {well_id}"
    context = {"well_id": well_id}
    
    return engine.retrieve(query, context)


@app.get("/api/v1/search/lessons")
async def search_lessons(
    formation: Optional[str] = None,
    event_type: Optional[str] = None
):
    """Search lessons learned"""
    engine = get_retrieval_engine()
    
    query = "lessons learned"
    context = {}
    
    if formation:
        query += f" for formation {formation}"
        context["formation"] = formation
    if event_type:
        query += f" for {event_type} events"
        context["event_types"] = [event_type]
    
    return engine.retrieve(query, context)


# =============================================================================
# REAL-TIME ENDPOINTS
# =============================================================================

@app.post("/api/v1/realtime/process")
async def process_real_time_data(request: RealTimeDataRequest):
    """Process real-time eRTMAC data and get historical context"""
    engine = get_realtime_engine()
    
    try:
        current_data = request.model_dump()
        context_package = engine.process_real_time_data(request.well_id, current_data)
        
        # Generate alert if needed
        alert = engine.generate_alert(context_package, current_data)
        
        return {
            "context": context_package,
            "alert": alert
        }
    except Exception as e:
        logger.error(f"Real-time processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/api/v1/realtime/ws/{well_id}")
async def realtime_websocket(websocket: WebSocket, well_id: str):
    """WebSocket for real-time eRTMAC streaming"""
    await websocket.accept()
    engine = get_realtime_engine()
    
    try:
        while True:
            data = await websocket.receive_json()
            current_data = data.get("data", {})
            current_data["well_id"] = well_id
            
            context_package = engine.process_real_time_data(well_id, current_data)
            alert = engine.generate_alert(context_package, current_data)
            
            await websocket.send_json({
                "context": context_package.model_dump() if hasattr(context_package, 'model_dump') else str(context_package),
                "alert": alert
            })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()


# =============================================================================
# WELL MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/api/v1/wells", status_code=201)
async def create_well(request: WellCreateRequest):
    """Create a new well"""
    repos = get_repositories()
    
    well_data = request.model_dump()
    well_data["surface_latitude"] = well_data.pop("latitude")
    well_data["surface_longitude"] = well_data.pop("longitude")
    well = repos["wells"].create_well(well_data)
    
    if not well:
        raise HTTPException(status_code=400, detail="Failed to create well")
    
    # Also create in Graphify
    from src.models.graphify_ontology import get_graphify_client, Provenance
    graphify = get_graphify_client()
    
    prov = Provenance(
        source_document_id="API",
        extraction_method="MANUAL_ENTRY",
        confidence=1.0,
        validation_status="ENGINEER_VALIDATED"
    )
    
    graphify.create_well({
        "entity_id": f"WELL-{well_data['well_code']}",
        "well_code": well_data['well_code'],
        "well_name": well_data['well_name'],
        "well_type": well_data['well_type'],
        "status": well_data['status'],
        "latitude": well_data['surface_latitude'],
        "longitude": well_data['surface_longitude'],
        "total_depth_md": well_data.get('total_depth_md'),
        "total_depth_tvd": well_data.get('total_depth_tvd'),
        "supabase_id": well['id']
    }, prov)
    
    return well


@app.get("/api/v1/wells")
async def list_wells(field_id: Optional[str] = None, limit: int = 100):
    """List wells"""
    repos = get_repositories()
    
    wells = repos["wells"].list_wells(field_id, limit)
    return {"wells": wells}


@app.get("/api/v1/wells/{well_id}")
async def get_well(well_id: str):
    """Get well details"""
    repos = get_repositories()
    
    well = repos["wells"].get_well(well_id)
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    
    return well


# =============================================================================
# FORMATION MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/api/v1/formations", status_code=201)
async def create_formation(request: FormationCreateRequest):
    """Create a new formation"""
    repos = get_repositories()
    
    formation_data = request.model_dump()
    formation = repos["formations"].create_formation(formation_data)
    
    if not formation:
        raise HTTPException(status_code=400, detail="Failed to create formation")
    
    # Also create in Graphify
    from src.models.graphify_ontology import get_graphify_client, Provenance
    graphify = get_graphify_client()
    
    prov = Provenance(
        source_document_id="API",
        extraction_method="MANUAL_ENTRY",
        confidence=1.0,
        validation_status="ENGINEER_VALIDATED"
    )
    
    graphify.create_formation({
        "entity_id": f"FORMATION-{formation_data['formation_code']}",
        "formation_code": formation_data['formation_code'],
        "formation_name": formation_data['formation_name'],
        "stratigraphic_unit": formation_data.get('stratigraphic_unit'),
        "age": formation_data.get('age'),
        "lithology": formation_data.get('lithology'),
        "description": formation_data.get('description'),
        "supabase_id": formation['id']
    }, prov)
    
    return formation


@app.get("/api/v1/formations/{formation_code}")
async def get_formation(formation_code: str):
    """Get formation details"""
    repos = get_repositories()
    
    formation = repos["formations"].get_formation_by_code(formation_code)
    if not formation:
        raise HTTPException(status_code=404, detail="Formation not found")
    
    return formation


# =============================================================================
# EVENT MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/api/v1/events", status_code=201)
async def create_event(request: EventCreateRequest):
    """Create a new operational event"""
    repos = get_repositories()
    
    event_data = request.model_dump()
    event = repos["events"].create_event(event_data)
    
    if not event:
        raise HTTPException(status_code=400, detail="Failed to create event")
    
    return event


@app.get("/api/v1/events/well/{well_id}")
async def get_well_events(well_id: str, event_type: Optional[str] = None):
    """Get events for a well"""
    repos = get_repositories()
    
    events = repos["events"].get_events_by_well(well_id, event_type)
    return {"events": events}


# =============================================================================
# ALERTS ENDPOINTS
# =============================================================================

@app.get("/api/v1/alerts")
async def get_alerts(well_id: Optional[str] = None, status: str = "ACTIVE"):
    """Get alerts"""
    repos = get_repositories()
    
    if well_id:
        alerts = repos["alerts"].get_active_alerts(well_id)
    else:
        # Would need a general list method
        alerts = []
    
    return {"alerts": alerts}


# =============================================================================
# STATISTICS ENDPOINTS
# =============================================================================

@app.get("/api/v1/stats/chromadb")
async def chromadb_stats():
    """Get ChromaDB collection statistics"""
    from src.models.chromadb_client import get_chromadb_client
    chromadb = get_chromadb_client()
    return chromadb.get_all_stats()


@app.get("/api/v1/stats/supabase")
async def supabase_stats():
    """Get SQL table statistics for the configured backend"""
    if (settings.sql.backend or "local").lower() == "supabase":
        supabase = get_supabase_client()
        tables = ["wells", "formations", "operational_events", "documents",
                  "lessons_learned", "risk_patterns", "alerts"]
        stats = {}
        for table in tables:
            try:
                result = supabase.table(table).select("id", count="exact").execute()
                stats[table] = result.count
            except Exception:
                stats[table] = 0
        return stats

    from src.models.local_sql import get_local_store
    return get_local_store().counts()


@app.get("/api/v1/graph/stats")
async def graph_stats():
    """Knowledge-graph statistics and per-backend availability."""
    from src.models.graph_resolver import get_graph_backend, graph_health
    try:
        graph_client, backend = get_graph_backend()
        stats = graph_client.stats()
        return {"backend": backend, "stats": stats, "backends": graph_health()}
    except Exception as error:
        return {"backend": None, "error": f"{type(error).__name__}: {error}",
                "backends": graph_health()}


@app.get("/api/v1/graph/view")
async def graph_view(
    backends: Optional[str] = None,
    limit: int = 750,
    merge: bool = True,
    focus: Optional[str] = None,
    depth: Optional[int] = None,
):
    """One snapshot of the knowledge graph for the 3D viewer.

    Works identically whether the data is served by Neo4j, the offline NetworkX
    graph, or both at once (``backends=local,neo4j``). ``focus`` + ``depth``
    restrict the result to the neighbourhood of a single entity.
    """
    from src.api.graph_viz import DEFAULT_LIMIT, MAX_LIMIT, fetch_snapshot

    wanted = [b.strip() for b in (backends or "local,neo4j").split(",") if b.strip()]
    return await asyncio.to_thread(
        fetch_snapshot,
        backends=wanted,
        limit=max(1, min(limit, MAX_LIMIT)) or DEFAULT_LIMIT,
        merge_backends=merge,
        focus=focus,
        depth=depth,
    )


@app.websocket("/api/v1/graph/stream")
async def graph_stream(
    websocket: WebSocket,
    interval: float = 3.0,
    backends: Optional[str] = None,
    limit: int = 750,
    merge: bool = True,
    focus: Optional[str] = None,
    depth: Optional[int] = None,
):
    """Live graph feed: pushes a snapshot first, then deltas as the graph grows.

    The socket re-reads both the Neo4j server and the offline local graph on
    every tick, so nodes and relationships appear in the browser the moment
    ingestion writes them - no reload, no polling from the client.

    Client control messages (all optional, so the socket also works for a plain
    fire-and-forget viewer):

    ``{"type": "ping"}``      - keep intermediaries from closing an idle socket
    ``{"type": "refresh"}``   - resend a full snapshot immediately
    ``{"type": "configure", "backends": ["local"], "limit": 2000,
       "focus": "WELL-X", "depth": 2, "merge": false, "interval": 5}``
      - change what the stream reads, and get a fresh snapshot straight away
    """
    from src.api.graph_viz import BACKENDS, MAX_INTERVAL, MIN_INTERVAL, diff_snapshots, fetch_snapshot

    await websocket.accept()
    state: Dict[str, Any] = {
        "backends": [b.strip() for b in (backends or ",".join(BACKENDS)).split(",") if b.strip()]
                   or list(BACKENDS),
        "limit": int(limit or 750),
        "merge": bool(merge),
        "focus": focus or None,
        "depth": depth or None,
        "interval": max(MIN_INTERVAL, min(float(interval or 3.0), MAX_INTERVAL)),
    }
    wake = asyncio.Event()
    full = False

    async def reader() -> None:
        """Consume client control messages without blocking the push loop."""
        nonlocal full
        while True:
            try:
                message = await websocket.receive_json()
            except Exception:
                return
            if not isinstance(message, dict):
                continue
            kind = message.get("type")
            if kind == "ping":
                try:
                    await websocket.send_json({"type": "pong", "ts": datetime.utcnow().isoformat()})
                except Exception:
                    return
            elif kind == "refresh":
                full = True
                wake.set()
            elif kind == "configure":
                if isinstance(message.get("backends"), list):
                    state["backends"] = [b for b in message["backends"] if b in BACKENDS] or list(BACKENDS)
                if message.get("limit"):
                    state["limit"] = int(message["limit"])
                if message.get("merge") is not None:
                    state["merge"] = bool(message["merge"])
                if "focus" in message:
                    state["focus"] = message.get("focus") or None
                if "depth" in message:
                    state["depth"] = message.get("depth") or None
                if message.get("interval"):
                    state["interval"] = max(MIN_INTERVAL, min(float(message["interval"]), MAX_INTERVAL))
                full = True
                wake.set()

    reader_task = asyncio.create_task(reader())
    previous: Optional[dict] = None
    try:
        while True:
            current = await asyncio.to_thread(
                fetch_snapshot,
                backends=state["backends"],
                limit=state["limit"],
                merge_backends=state["merge"],
                focus=state["focus"],
                depth=state["depth"],
            )
            message = diff_snapshots(previous, current) if not full else None
            if message is None and (full or previous is None):
                message = {"type": "snapshot", **current}
            if message is not None:
                await websocket.send_json(message)
            full = False
            previous = current
            wake.clear()
            try:
                await asyncio.wait_for(wake.wait(), timeout=state["interval"])
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        logger.info("graph stream client disconnected")
    except Exception as error:
        logger.warning("graph stream error: %s", error)
        try:
            await websocket.send_json({"type": "error", "message": f"{type(error).__name__}: {error}"})
        except Exception:
            pass
    finally:
        reader_task.cancel()


@app.post("/api/v1/graph/reseed")
async def graph_reseed(target: str = "local"):
    """Rebuild a knowledge graph from the local SQL store."""
    from src.models.graph_resolver import reset_graph_backend
    from src.models.local_graph import seed_local_graph, seed_neo4j
    reset_graph_backend()
    if target == "neo4j":
        return {"reseeded": True, "target": "neo4j", "stats": seed_neo4j()}
    return {"reseeded": True, "target": "local", "stats": seed_local_graph()}


@app.get("/api/v1/stats/graph")
async def graph_stats_legacy():
    """Per-label knowledge-graph counts (Neo4j)."""
    from src.models.graphify_ontology import get_graphify_client
    queries = {
        "wells": "MATCH (n:Well) RETURN count(n) as count",
        "formations": "MATCH (n:Formation) RETURN count(n) as count",
        "events": "MATCH (n:OperationalEvent) RETURN count(n) as count",
        "documents": "MATCH (n:Document) RETURN count(n) as count",
        "relationships": "MATCH ()-[r]->() RETURN count(r) as count",
    }
    
    stats = {"available": True}
    try:
        graph = get_graphify_client()
        for key, query in queries.items():
            try:
                result = graph.execute_query(query)
                stats[key] = result[0]["count"] if result else 0
            except Exception:
                stats[key] = 0
    except Exception as e:
        stats["available"] = False
        stats["detail"] = f"unavailable: {type(e).__name__}"
    
    return stats


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host=settings.app.host,
        port=settings.app.port,
        reload=settings.app.debug,
        log_level=settings.app.log_level.lower()
    )