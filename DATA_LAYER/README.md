# NWIS - Nearby Wells Intelligence System

An AI/ML-enabled decision-support platform designed to provide drilling engineers with rapid access to historical drilling knowledge from nearby and analogous wells while continuously considering the current operational state of the active well.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Supabase      │     │   Graphify      │     │   ChromaDB      │
│   (PostgreSQL)  │     │   (Neo4j)       │     │   (Vector DB)   │
│─────────────────│     │─────────────────│     │─────────────────│
│ Structured data │     │ Relationships   │     │ Semantic search │
│ Wells, events,  │     │ Wells, forms,   │     │ Documents,      │
│ formations,     │     │ events, risks,  │     │ lessons,        │
│ documents,      │     │ causes,         │     │ summaries,      │
│ features        │     │ mitigations     │     │ formations      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Hybrid Retrieval       │
                    │  Engine                 │
                    │─────────────────────────│
                    │ Graph + Vector + SQL    │
                    │ Spatial + Depth + Time  │
                    │ Re-ranking + Evidence   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  AI/ML Intelligence     │
                    │─────────────────────────│
                    │ RAG + Analogue Matching │
                    │ Risk Prediction         │
                    │ Pattern Detection       │
                    │ Alert Generation        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  NWIS Application       │
                    │─────────────────────────│
                    │ Map + Search + AI       │
                    │ Risk Alerts + History   │
                    │ Source Documents        │
                    └─────────────────────────┘
```

## Data Stores Responsibility

| Store | Purpose | Answers |
|-------|---------|---------|
| **Supabase** | Structured operational data | "What is the exact value?" |
| **Graphify** | Relationships & context | "What is related to what?" |
| **ChromaDB** | Semantic memory | "What is conceptually similar?" |
| **Document Store** | Original evidence | "Show me the source" |

## Features

- **Multi-modal Ingestion**: PDF OCR, text extraction, table parsing, NLP entity extraction
- **Knowledge Graph**: Full drilling ontology with wells, formations, events, risks, mitigations
- **Vector Search**: Semantic search across documents, events, lessons, formations
- **Hybrid Retrieval**: Graph traversal + vector similarity + SQL filtering + spatial/depth search
- **Real-time Integration**: eRTMAC streaming data with historical analogue alerts
- **Provenance Tracking**: Every fact traceable to source document and page
- **REST API + WebSocket**: Full programmatic access
- **CLI**: Command-line tools for ingestion, search, and management

## Quick Start

### Prerequisites

- Python 3.10+
- Supabase account (PostgreSQL + Storage)
- Neo4j database (local or cloud)
- ChromaDB (local or cloud)
- Tesseract OCR installed

### Installation

```bash
# Clone and enter directory
cd nwis

# Run setup (creates venv, installs deps, downloads models)
python setup.py

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Configure environment
cp .env.template .env
# Edit .env with your credentials

# Initialize databases
python -m src.cli init-db

# Start API server
python -m src.cli serve
```

### Environment Configuration

Copy `.env.template` to `.env` and configure:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Neo4j/Graphify
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# Embeddings (local CPU model)
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
```

### Using Docker (Optional)

```bash
# Start supporting services
docker-compose up -d

# Then run setup
python setup.py
```

## Usage

### CLI Commands

```bash
# Ingest a PDF document
python -m src.cli ingest path/to/report.pdf --doc-type DDR --well-code WELL-042

# Search for historical events
python -m src.cli search "mud losses in Formation-X around 3000m" --formation Formation-X --depth 3100

# Process real-time data
python -m src.cli realtime WELL-200 --depth 3050 --formation Formation-X --torque 15000

# Check system stats
python -m src.cli stats

# Create well/formation
python -m src.cli create-well WELL-100 "Well 100" FIELD-A --lat 25.123 --lon 55.456
```

### API Endpoints

```bash
# Health check
GET /health

# Document ingestion
POST /api/v1/documents/upload
POST /api/v1/documents/upload-text

# Search
POST /api/v1/search
GET /api/v1/search/nearby-wells?lat=25.1&lon=55.4&radius_km=5&formation=Formation-X
GET /api/v1/search/formation/{formation_code}
GET /api/v1/search/well/{well_id}

# Real-time
POST /api/v1/realtime/process
WS /api/v1/realtime/ws/{well_id}

# Management
GET/POST /api/v1/wells
GET/POST /api/v1/formations
GET/POST /api/v1/events
GET /api/v1/alerts
```

### Python SDK

```python
from src.ingestion.pipeline import ingest_document
from src.retrieval.hybrid_engine import get_retrieval_engine

# Ingest document
result = ingest_document("report.pdf", {
    "document_type": "DDR",
    "well_code": "WELL-042",
    "formation": "Formation-X"
})

# Search
engine = get_retrieval_engine()
context = engine.retrieve(
    "Show stuck pipe events in Formation-X near 3000m",
    {"formation": "Formation-X", "depth_from": 2950, "depth_to": 3150}
)

# Access results
for event in context.historical_events:
    print(f"{event['well_code']}: {event['event_type']} at {event['depth_from_md']}m")
    print(f"  Mitigation: {event['mitigation_applied']}")
    print(f"  Source: {event['graph_context'].get('documents', [])}")
```

## Ingestion Pipeline

```
PDF Upload
    │
    ▼
Document Registration (Supabase)
    │
    ▼
OCR + Text Extraction (pdfplumber + Tesseract/PaddleOCR)
    │
    ▼
NLP Processing (spaCy + Custom Patterns)
    ├─ Entity Extraction (wells, formations, depths, events)
    ├─ Event Extraction (structured event objects)
    └─ Relation Extraction (event→formation, event→cause, etc.)
    │
    ▼
Entity Resolution (canonical IDs)
    │
    ▼
Graphify Update (nodes + relationships)
    │
    ▼
Semantic Chunking (drilling-aware)
    │
    ▼
Embeddings (local sentence-transformers)
    │
    ▼
ChromaDB (5 collections)
    │
    ▼
Supabase Chunk References
```

## Retrieval Flow

```
User Query
    │
    ▼
Query Understanding (Intent + Entities)
    │
    ├─► Geographic Filter (Supabase PostGIS)
    ├─► Geological Filter (Graphify traversal)
    ├─► Depth Filter (Graphify/Supabase)
    ├─► Semantic Search (ChromaDB)
    └─► Graph Expansion (causes, mitigations, documents)
    │
    ▼
Result Fusion + Re-ranking
    │
    ▼
Evidence Retrieval (source documents)
    │
    ▼
Context Package → LLM/RAG → Answer + Citations
```

## Project Structure

```
nwis/
├── src/
│   ├── api/              # FastAPI endpoints
│   ├── config/           # Settings management
│   ├── ingestion/        # PDF processing, NLP, pipeline
│   ├── models/           # Supabase, Graphify, ChromaDB clients
│   ├── retrieval/        # Hybrid retrieval engine
│   ├── cli.py            # Command-line interface
│   └── __init__.py
├── tests/
├── scripts/
├── docs/
├── requirements.txt
├── setup.py
├── .env.template
├── docker-compose.yml
└── README.md
```

## Development

```bash
# Run tests
pytest tests/

# Format code
black src/
ruff check src/

# Type checking
mypy src/
```

## License

Proprietary - Internal Use Only