"""NWIS Command Line Interface"""
import click
import os
import sys
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config.settings import get_settings, Settings
from src.ingestion.pipeline import ingest_document
from src.retrieval.hybrid_engine import get_retrieval_engine, get_realtime_engine
from src.models.supabase_schema import get_supabase_client, get_repositories
from src.models.graphify_ontology import get_graphify_client
from src.models.chromadb_client import get_chromadb_client

console = Console()
settings = get_settings()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.pass_context
def cli(ctx, verbose):
    """NWIS - Nearby Wells Intelligence System CLI"""
    ctx.ensure_object(dict)
    ctx.obj['verbose'] = verbose
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)


@cli.command()
@click.option('--host', default='0.0.0.0', help='Host to bind to')
@click.option('--port', default=8000, help='Port to bind to')
@click.option('--reload', is_flag=True, help='Enable auto-reload')
def serve(host, port, reload):
    """Start the NWIS API server"""
    import uvicorn
    
    console.print(Panel.fit(
        f"[bold blue]Starting NWIS API Server[/bold blue]\n"
        f"Host: {host}\nPort: {port}\nReload: {reload}",
        title="NWIS Server"
    ))
    
    uvicorn.run(
        "src.api.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=settings.app.log_level.lower()
    )


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--doc-type', '-t', required=True, help='Document type (WCR, DDR, MUD_REPORT, etc.)')
@click.option('--well-id', help='Associated well ID')
@click.option('--well-code', help='Associated well code')
@click.option('--title', help='Document title')
@click.option('--date', help='Document date (YYYY-MM-DD)')
@click.option('--author', help='Document author')
@click.option('--confidentiality', default='INTERNAL', help='Confidentiality level')
def ingest(file_path, doc_type, well_id, well_code, title, date, author, confidentiality):
    """Ingest a PDF or text document"""
    
    console.print(f"[bold]Ingesting document:[/bold] {file_path}")
    
    metadata = {
        "document_type": doc_type,
        "well_id": well_id,
        "well_code": well_code,
        "title": title or Path(file_path).stem,
        "document_date": date,
        "author": author,
        "confidentiality": confidentiality,
    }
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Processing document...", total=None)
        result = ingest_document(file_path, metadata)
        progress.update(task, completed=True)
    
    # Display results
    table = Table(title="Ingestion Result")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Document ID", result.document_id)
    table.add_row("Document Code", result.document_code)
    table.add_row("Status", result.status)
    table.add_row("Chunks Created", str(result.chunks_created))
    table.add_row("Entities Extracted", str(result.entities_extracted))
    table.add_row("Events Extracted", str(result.events_extracted))
    table.add_row("Graph Nodes Created", str(result.graph_nodes_created))
    table.add_row("Graph Relations Created", str(result.graph_relations_created))
    table.add_row("ChromaDB Vectors Added", str(result.chromadb_vectors_added))
    
    if result.errors:
        table.add_row("Errors", "\n".join(result.errors))
    if result.warnings:
        table.add_row("Warnings", "\n".join(result.warnings))
    
    console.print(table)


@cli.command()
@click.argument('query')
@click.option('--well-id', help='Active well ID for context')
@click.option('--formation', help='Formation for context')
@click.option('--depth', type=float, help='Current depth for context')
@click.option('--lat', type=float, help='Latitude for spatial search')
@click.option('--lon', type=float, help='Longitude for spatial search')
@click.option('--radius', default=5.0, help='Search radius in km')
@click.option('--top-k', default=20, help='Number of results')
def search(query, well_id, formation, depth, lat, lon, radius, top_k):
    """Search NWIS knowledge base"""
    
    console.print(f"[bold]Searching:[/bold] {query}")
    
    context = {}
    if well_id:
        context['active_well_id'] = well_id
    if formation:
        context['formation'] = formation
    if depth:
        context['current_depth'] = depth
    if lat and lon:
        context['latitude'] = lat
        context['longitude'] = lon
    if radius:
        context['radius_km'] = radius
    
    engine = get_retrieval_engine()
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Searching...", total=None)
        result = engine.retrieve(query, context, top_k)
        progress.update(task, completed=True)
    
    # Display results
    console.print(f"\n[bold]Active Well:[/bold] {result.active_well.get('well_code', 'N/A')}")
    console.print(f"[bold]Nearby Wells:[/bold] {len(result.nearby_wells)}")
    console.print(f"[bold]Historical Events:[/bold] {len(result.historical_events)}")
    console.print(f"[bold]Lessons Learned:[/bold] {len(result.lessons)}")
    console.print(f"[bold]Source Documents:[/bold] {len(result.source_documents)}")
    
    if result.historical_events:
        table = Table(title="Historical Events")
        table.add_column("Well", style="cyan")
        table.add_column("Event", style="yellow")
        table.add_column("Depth (m)", style="green")
        table.add_column("Severity", style="red")
        table.add_column("Distance (km)", style="blue")
        table.add_column("Mitigation", style="magenta")
        
        for event in result.historical_events[:10]:
            table.add_row(
                event.get('well_code', 'N/A'),
                event.get('event_type', 'N/A'),
                str(event.get('depth_from_md', 'N/A')),
                event.get('severity', 'N/A'),
                f"{event.get('distance_km', 0):.1f}",
                event.get('mitigation_applied', 'N/A')[:50]
            )
        
        console.print(table)
    
    if result.lessons:
        console.print("\n[bold]Lessons Learned:[/bold]")
        for lesson in result.lessons[:5]:
            console.print(f"  â€¢ {lesson.get('title', 'N/A')}: {lesson.get('recommendation', 'N/A')[:100]}...")


@cli.command()
@click.argument('well_id')
@click.option('--depth', type=float, required=True, help='Current depth')
@click.option('--formation', help='Current formation')
@click.option('--torque', type=float, help='Current torque')
@click.option('--rop', type=float, help='Current ROP')
@click.option('--spp', type=float, help='Current SPP')
def realtime(well_id, depth, formation, torque, rop, spp):
    """Process real-time drilling data and get historical context"""
    
    console.print(f"[bold]Processing real-time data for well:[/bold] {well_id}")
    
    current_data = {
        "depth": depth,
        "formation": formation,
        "torque": torque,
        "rop": rop,
        "spp": spp,
    }
    
    engine = get_realtime_engine()
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Analyzing real-time data...", total=None)
        context_package = engine.process_real_time_data(well_id, current_data)
        alert = engine.generate_alert(context_package, current_data)
        progress.update(task, completed=True)
    
    if alert:
        console.print(Panel(
            f"[bold red]{alert['title']}[/bold red]\n\n"
            f"{alert['description']}\n\n"
            f"Nearest Analogue: {alert['nearest_analogue']} at {alert['analogue_depth']}m\n"
            f"Historical Mitigation: {alert['historical_mitigation']}\n"
            f"Risk Score: {alert['risk_score']:.0%}",
            title="âš ï¸ ALERT",
            border_style="red"
        ))
    else:
        console.print("[green]No historical analogues found for current conditions[/green]")
    
    console.print(f"\n[bold]Historical Events Found:[/bold] {len(context_package.historical_events)}")
    console.print(f"[bold]Lessons Available:[/bold] {len(context_package.lessons)}")


@cli.command()
def init_db():
    """Initialize database schema and knowledge graph"""
    
    console.print("[bold]Initializing NWIS databases...[/bold]")
    
    # Initialize Neo4j schema
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Initializing Neo4j schema...", total=None)
        graphify = get_graphify_client()
        graphify.initialize_schema()
        progress.update(task, completed=True)
    
    # Initialize ChromaDB collections
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Initializing ChromaDB collections...", total=None)
        chromadb = get_chromadb_client()
        chromadb.initialize_collections()
        progress.update(task, completed=True)
    
    console.print("[green]âœ“[/green] Database initialization complete!")


@cli.command()
def stats():
    """Show system statistics"""
    
    console.print("[bold]NWIS System Statistics[/bold]\n")
    
    # Supabase stats
    supabase = get_supabase_client()
    tables = ["wells", "formations", "operational_events", "documents", 
              "lessons_learned", "risk_patterns", "alerts", "document_chunks"]
    
    table = Table(title="Supabase (PostgreSQL)")
    table.add_column("Table", style="cyan")
    table.add_column("Count", style="green")
    
    for table_name in tables:
        try:
            result = supabase.table(table_name).select("id", count="exact").execute()
            table.add_row(table_name, str(result.count))
        except Exception as e:
            table.add_row(table_name, f"Error: {e}")
    
    console.print(table)
    
    # ChromaDB stats
    chromadb = get_chromadb_client()
    chroma_stats = chromadb.get_all_stats()
    
    table2 = Table(title="ChromaDB Collections")
    table2.add_column("Collection", style="cyan")
    table2.add_column("Vectors", style="green")
    
    for name, stat in chroma_stats.items():
        table2.add_row(name, str(stat.get('count', 0)))
    
    console.print(table2)
    
    # Neo4j stats
    graphify = get_graphify_client()
    
    queries = {
        "Wells": f"MATCH (n:{'Well'}) RETURN count(n) as count",
        "Formations": f"MATCH (n:{'Formation'}) RETURN count(n) as count",
        "Events": f"MATCH (n:{'OperationalEvent'}) RETURN count(n) as count",
        "Documents": f"MATCH (n:{'Document'}) RETURN count(n) as count",
        "Relationships": "MATCH ()-[r]->() RETURN count(r) as count",
    }
    
    table3 = Table(title="Neo4j")
    table3.add_column("Node Type", style="cyan")
    table3.add_column("Count", style="green")
    
    for name, query in queries.items():
        try:
            result = graphify.execute_query(query)
            count = result[0]["count"] if result else 0
            table3.add_row(name, str(count))
        except Exception as e:
            table3.add_row(name, f"Error: {e}")
    
    console.print(table3)


@cli.command()
@click.argument('well_code')
@click.argument('well_name')
@click.argument('field_id')
@click.option('--lat', type=float, required=True, help='Latitude')
@click.option('--lon', type=float, required=True, help='Longitude')
@click.option('--well-type', default='DEVELOPMENT', help='Well type')
@click.option('--td-md', type=float, help='Total depth MD')
@click.option('--td-tvd', type=float, help='Total depth TVD')
def create_well(well_code, well_name, field_id, lat, lon, well_type, td_md, td_tvd):
    """Create a new well"""
    
    from src.models.graphify_ontology import Provenance
    from datetime import datetime
    
    supabase = get_supabase_client()
    repos = get_repositories(supabase)
    graphify = get_graphify_client()
    
    well_data = {
        "well_code": well_code,
        "well_name": well_name,
        "well_type": well_type,
        "field_id": field_id,
        "latitude": lat,
        "longitude": lon,
        "total_depth_md": td_md,
        "total_depth_tvd": td_tvd,
        "status": "PLANNED"
    }
    
    # Create in Supabase
    well = repos["wells"].create_well(well_data)
    console.print(f"[green]Created well in Supabase:[/green] {well['id']}")
    
    # Create in Neo4j
    prov = Provenance(
        source_document_id="CLI",
        extraction_method="MANUAL_ENTRY",
        confidence=1.0,
        validation_status="ENGINEER_VALIDATED",
        extracted_at=datetime.utcnow().isoformat()
    )
    
    entity_id = graphify.create_well({
        "entity_id": f"WELL-{well_code}",
        "well_code": well_code,
        "well_name": well_name,
        "well_type": well_type,
        "status": "PLANNED",
        "latitude": lat,
        "longitude": lon,
        "total_depth_md": td_md,
        "total_depth_tvd": td_tvd,
        "supabase_id": well['id']
    }, prov)
    
    console.print(f"[green]Created well in Neo4j:[/green] {entity_id}")


@cli.command()
@click.argument('formation_code')
@click.argument('formation_name')
@click.option('--unit', help='Stratigraphic unit')
@click.option('--age', help='Geological age')
@click.option('--lithology', help='Lithology description')
@click.option('--description', help='Formation description')
def create_formation(formation_code, formation_name, unit, age, lithology, description):
    """Create a new formation"""
    
    from src.models.graphify_ontology import Provenance
    from datetime import datetime
    
    supabase = get_supabase_client()
    repos = get_repositories(supabase)
    graphify = get_graphify_client()
    
    formation_data = {
        "formation_code": formation_code,
        "formation_name": formation_name,
        "stratigraphic_unit": unit,
        "age": age,
        "lithology": lithology,
        "description": description
    }
    
    # Create in Supabase
    formation = repos["formations"].create_formation(formation_data)
    console.print(f"[green]Created formation in Supabase:[/green] {formation['id']}")
    
    # Create in Neo4j
    prov = Provenance(
        source_document_id="CLI",
        extraction_method="MANUAL_ENTRY",
        confidence=1.0,
        validation_status="ENGINEER_VALIDATED",
        extracted_at=datetime.utcnow().isoformat()
    )
    
    entity_id = graphify.create_formation({
        "entity_id": f"FORMATION-{formation_code}",
        "formation_code": formation_code,
        "formation_name": formation_name,
        "stratigraphic_unit": unit,
        "age": age,
        "lithology": lithology,
        "description": description,
        "supabase_id": formation['id']
    }, prov)
    
    console.print(f"[green]Created formation in Neo4j:[/green] {entity_id}")


@cli.command()
def check_connections():
    """Check all service connections"""
    
    console.print("[bold]Checking NWIS Service Connections[/bold]\n")
    
    checks = []
    
    # Supabase
    try:
        supabase = get_supabase_client()
        supabase.table("wells").select("id").limit(1).execute()
        checks.append(("Supabase", "âœ“ Connected", "green"))
    except Exception as e:
        checks.append(("Supabase", f"âœ— {e}", "red"))
    
    # ChromaDB
    try:
        chromadb = get_chromadb_client()
        chromadb.client.heartbeat()
        checks.append(("ChromaDB", "âœ“ Connected", "green"))
    except Exception as e:
        checks.append(("ChromaDB", f"âœ— {e}", "red"))
    
    # Neo4j
    try:
        graphify = get_graphify_client()
        graphify.execute_query("RETURN 1")
        checks.append(("Neo4j", "âœ“ Connected", "green"))
    except Exception as e:
        checks.append(("Neo4j", f"âœ— {e}", "red"))
    
    table = Table()
    table.add_column("Service", style="cyan")
    table.add_column("Status", style="white")
    
    for name, status, color in checks:
        table.add_row(name, f"[{color}]{status}[/{color}]")
    
    console.print(table)


if __name__ == "__main__":
    cli()