"""Complete Ingestion Pipeline for NWIS"""
import os
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

from src.config.settings import get_settings
from src.models.supabase_schema import get_supabase_client, get_repositories
from src.models.graphify_ontology import get_graphify_client, Provenance, NodeLabel, RelationshipType
from src.models.graph_resolver import get_graph_backend
from src.models.chromadb_client import get_chromadb_client, build_metadata_filter
from src.ingestion.pdf_processor import PDFProcessor, TextProcessor, SemanticChunker, DocumentStructure
from src.ingestion.nlp_extractor import get_nlp_engine, get_entity_resolver, get_unit_normalizer, ExtractedEvent

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class IngestionResult:
    """Result of document ingestion"""
    document_id: str
    document_code: str
    status: str
    chunks_created: int
    entities_extracted: int
    events_extracted: int
    graph_nodes_created: int
    graph_relations_created: int
    chromadb_vectors_added: int
    errors: List[str]
    warnings: List[str]


class IngestionPipeline:
    """End-to-end ingestion pipeline for NWIS"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.repos = get_repositories(self.supabase)
        # Graph writes go to the configured backend (offline local graph by default)
        self.graphify, self.graph_backend = get_graph_backend()
        self.chromadb = get_chromadb_client()
        self.pdf_processor = PDFProcessor()
        self.text_processor = TextProcessor()
        self.chunker = SemanticChunker()
        self.nlp = get_nlp_engine()
        self.resolver = get_entity_resolver()
        self.normalizer = get_unit_normalizer()
    
    def ingest_pdf(self, file_path: str, document_metadata: Dict[str, Any]) -> IngestionResult:
        """Ingest a PDF document"""
        logger.info(f"Starting ingestion of PDF: {file_path}")
        
        errors = []
        warnings = []
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        document_code = document_metadata.get("document_code", f"DOC-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        
        try:
            # Step 1: Register document in Supabase
            doc_record = self._register_document(document_id, document_code, document_metadata, file_path)
            
            # Step 2: Process PDF
            doc_structure = self.pdf_processor.process_pdf(file_path, document_id)
            
            # Step 3: Update OCR status
            self.repos["documents"].update_processing_status(
                document_id, "OCR_COMPLETE", 
                ocr_confidence=self._avg_ocr_confidence(doc_structure),
                page_count=doc_structure.page_count
            )
            
            # Step 4: NLP Processing
            self.repos["documents"].update_processing_status(document_id, "NLP_PROCESSING")
            
            entities = self.nlp.extract_entities(doc_structure.full_text)
            events = self.nlp.extract_events(doc_structure.full_text, entities)
            relations = self.nlp.extract_relations(doc_structure.full_text, entities)
            
            # Step 5: Entity Resolution
            resolved_entities = self._resolve_entities(entities)
            resolved_events = self._resolve_events(events)
            
            # Step 6: Update NLP status
            self.repos["documents"].update_processing_status(
                document_id, "NLP_COMPLETE",
                extraction_confidence=self._avg_extraction_confidence(entities)
            )
            
            # Step 7: Entity Resolution & Graphify
            self.repos["documents"].update_processing_status(document_id, "ENTITY_RESOLUTION")
            try:
                graph_nodes, graph_relations = self._update_knowledge_graph(
                    document_id, document_code, doc_structure, resolved_entities, resolved_events, relations,
                    document_metadata,
                )
            except Exception as graph_error:
                # The knowledge graph is an optional enrichment: a graph outage
                # must not block chunking, embedding and indexing.
                graph_nodes, graph_relations = 0, 0
                warning = f"Knowledge graph unavailable, document indexed without graph nodes: {graph_error}"
                logger.warning(warning)
                warnings.append(warning)
                self.repos["documents"].update_processing_status(document_id, "GRAPH_SKIPPED")
                self.graphify = None
            
            # Step 8: Chunking
            self.repos["documents"].update_processing_status(document_id, "EMBEDDING")
            chunks = self.chunker.chunk_document(doc_structure, document_metadata)
            
            # Step 9: Add to ChromaDB
            chromadb_ids = self._add_to_chromadb(document_id, document_code, chunks, resolved_events)
            
            # Step 10: Update Supabase with chunk references
            self._save_chunks_to_supabase(document_id, chunks, chromadb_ids)
            
            # Step 11: Final status
            self.repos["documents"].update_processing_status(document_id, "INDEXED")
            
            result = IngestionResult(
                document_id=document_id,
                document_code=document_code,
                status="SUCCESS",
                chunks_created=len(chunks),
                entities_extracted=len(entities),
                events_extracted=len(events),
                graph_nodes_created=graph_nodes,
                graph_relations_created=graph_relations,
                chromadb_vectors_added=len(chromadb_ids),
                errors=errors,
                warnings=warnings
            )
            
            logger.info(f"Ingestion complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Ingestion failed: {e}", exc_info=True)
            errors.append(str(e))
            self.repos["documents"].update_processing_status(document_id, "FAILED")
            
            return IngestionResult(
                document_id=document_id,
                document_code=document_code,
                status="FAILED",
                chunks_created=0,
                entities_extracted=0,
                events_extracted=0,
                graph_nodes_created=0,
                graph_relations_created=0,
                chromadb_vectors_added=0,
                errors=errors,
                warnings=warnings
            )
    
    def ingest_text(self, file_path: str, document_metadata: Dict[str, Any]) -> IngestionResult:
        """Ingest a text file"""
        logger.info(f"Starting ingestion of text file: {file_path}")
        
        errors = []
        warnings = []
        document_id = str(uuid.uuid4())
        document_code = document_metadata.get("document_code", f"DOC-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        
        try:
            # Register document
            doc_record = self._register_document(document_id, document_code, document_metadata, file_path)
            
            # Process text
            doc_structure = self.text_processor.process_text_file(file_path, document_id)
            
            self.repos["documents"].update_processing_status(document_id, "OCR_COMPLETE", ocr_confidence=1.0)
            
            # NLP Processing
            self.repos["documents"].update_processing_status(document_id, "NLP_PROCESSING")
            
            entities = self.nlp.extract_entities(doc_structure.full_text)
            events = self.nlp.extract_events(doc_structure.full_text, entities)
            relations = self.nlp.extract_relations(doc_structure.full_text, entities)
            
            resolved_entities = self._resolve_entities(entities)
            resolved_events = self._resolve_events(events)
            
            self.repos["documents"].update_processing_status(document_id, "NLP_COMPLETE")
            
            # Graphify
            self.repos["documents"].update_processing_status(document_id, "ENTITY_RESOLUTION")
            try:
                graph_nodes, graph_relations = self._update_knowledge_graph(
                    document_id, document_code, doc_structure, resolved_entities, resolved_events, relations,
                    document_metadata,
                )
            except Exception as graph_error:
                # The knowledge graph is an optional enrichment: a graph outage
                # must not block chunking, embedding and indexing.
                graph_nodes, graph_relations = 0, 0
                warning = f"Knowledge graph unavailable, document indexed without graph nodes: {graph_error}"
                logger.warning(warning)
                warnings.append(warning)
                self.repos["documents"].update_processing_status(document_id, "GRAPH_SKIPPED")
                self.graphify = None
            
            # Chunking
            self.repos["documents"].update_processing_status(document_id, "EMBEDDING")
            chunks = self.chunker.chunk_document(doc_structure, document_metadata)
            
            # ChromaDB
            chromadb_ids = self._add_to_chromadb(document_id, document_code, chunks, resolved_events)
            
            # Save chunks
            self._save_chunks_to_supabase(document_id, chunks, chromadb_ids)
            
            # Final
            self.repos["documents"].update_processing_status(document_id, "INDEXED")
            
            return IngestionResult(
                document_id=document_id,
                document_code=document_code,
                status="SUCCESS",
                chunks_created=len(chunks),
                entities_extracted=len(entities),
                events_extracted=len(events),
                graph_nodes_created=graph_nodes,
                graph_relations_created=graph_relations,
                chromadb_vectors_added=len(chromadb_ids),
                errors=errors,
                warnings=warnings
            )
            
        except Exception as e:
            logger.error(f"Text ingestion failed: {e}", exc_info=True)
            errors.append(str(e))
            self.repos["documents"].update_processing_status(document_id, "FAILED")
            
            return IngestionResult(
                document_id=document_id,
                document_code=document_code,
                status="FAILED",
                chunks_created=0,
                entities_extracted=0,
                events_extracted=0,
                graph_nodes_created=0,
                graph_relations_created=0,
                chromadb_vectors_added=0,
                errors=errors,
                warnings=warnings
            )
    
    def _register_document(self, document_id: str, document_code: str, metadata: Dict, file_path: str) -> Dict:
        """Register document in Supabase"""
        doc_data = {
            "id": document_id,
            "document_code": document_code,
            "document_type": metadata.get("document_type", "OTHER"),
            "well_id": metadata.get("well_id"),
            "title": metadata.get("title", ""),
            "source_file_path": file_path,
            "file_size_bytes": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            "document_date": metadata.get("document_date"),
            "author": metadata.get("author", ""),
            "confidentiality": metadata.get("confidentiality", "INTERNAL"),
            "processing_status": "UPLOADED",
            "metadata": metadata
        }
        return self.repos["documents"].create_document(doc_data)
    
    def _avg_ocr_confidence(self, doc_structure: DocumentStructure) -> float:
        """Calculate average OCR confidence"""
        if not doc_structure.pages:
            return 1.0
        return sum(p.ocr_confidence for p in doc_structure.pages) / len(doc_structure.pages)
    
    def _avg_extraction_confidence(self, entities: List) -> float:
        """Calculate average extraction confidence"""
        if not entities:
            return 0.0
        return sum(e.confidence for e in entities) / len(entities)
    
    def _resolve_entities(self, entities: List) -> List:
        """Apply entity resolution"""
        resolved = []
        for ent in entities:
            if ent.label.value == "WELL":
                ent.normalized_value = self.resolver.resolve_well(ent.normalized_value or ent.text)
            elif ent.label.value == "FORMATION":
                ent.normalized_value = self.resolver.resolve_formation(ent.normalized_value or ent.text)
            resolved.append(ent)
        return resolved
    
    def _resolve_events(self, events: List[ExtractedEvent]) -> List[ExtractedEvent]:
        """Resolve event entities"""
        for event in events:
            if event.formation:
                event.formation = self.resolver.resolve_formation(event.formation)
        return events
    
    def _update_knowledge_graph(self, document_id: str, document_code: str,
                                 doc_structure: DocumentStructure,
                                 entities: List, events: List[ExtractedEvent],
                                 relations: List,
                                 document_metadata: Dict[str, Any] = None) -> Tuple[int, int]:
        """Update knowledge graph with extracted information"""
        nodes_created = 0
        relations_created = 0
        # Values supplied by the uploader win over anything the parser guessed.
        metadata = {**(doc_structure.metadata or {}), **(document_metadata or {})}
        
        # Create document node
        provenance = Provenance(
            source_document_id=document_code,
            extraction_method="NLP_PIPELINE",
            extraction_model=settings.nlp.spacy_model,
            confidence=0.85,
            validation_status="AI_EXTRACTED",
            extracted_at=datetime.utcnow().isoformat()
        )
        
        doc_entity_id = self.graphify.create_document({
            "entity_id": f"DOC-{document_code}",
            "document_code": document_code,
            "document_type": metadata.get("document_type") or "OTHER",
            "title": metadata.get("title") or "",
            "document_date": metadata.get("document_date"),
            "well_code": metadata.get("well_code"),
            "page_count": doc_structure.page_count,
            "supabase_id": document_id
        }, provenance)
        nodes_created += 1
        
        # Resolve the well: an explicitly supplied well_code is authoritative,
        # because NER happily reads the word after "Well" in "Well Report".
        well_entities = [e for e in entities if e.label.value == "WELL"]
        well_entity_id = None
        supplied_well = (metadata.get("well_code") or metadata.get("well_id") or "").strip()
        well_code = supplied_well or (well_entities[0].normalized_value if well_entities else None)
        if well_code:
            well_entity_id = self.graphify.create_well({
                "entity_id": f"WELL-{well_code}",
                "well_code": well_code,
                "supabase_id": well_entities[0].metadata.get("supabase_id") if well_entities else None
            }, provenance)
            nodes_created += 1
            
            # Link document to well
            self.graphify.link_document_well(doc_entity_id, well_entity_id, provenance)
            relations_created += 1
        
        # Create formation nodes and link to well
        formation_entities = [e for e in entities if e.label.value == "FORMATION"]
        formation_ids = {}
        for fe in formation_entities:
            f_code = fe.normalized_value
            f_id = self.graphify.create_formation({
                "entity_id": f"FORMATION-{f_code}",
                "formation_code": f_code,
                "formation_name": f_code
            }, provenance)
            formation_ids[f_code] = f_id
            nodes_created += 1
            
            if well_entity_id:
                self.graphify.link_well_formation(well_entity_id, f_id, {}, provenance)
                relations_created += 1
        
        # Create event nodes
        event_ids = {}
        for event in events:
            if event.confidence < settings.ingestion.event_extraction_confidence:
                continue
            
            event_code = f"EVT-{document_code}-{len(event_ids)}"
            event_data = {
                "entity_id": f"EVENT-{event_code}",
                "event_code": event_code,
                "event_type": event.event_type,
                "severity": event.severity,
                "depth_from_md": event.depth_from,
                "depth_to_md": event.depth_to,
                "description": event.source_text,
                "mitigation_applied": event.mitigation,
                "confidence": event.confidence,
                "supabase_id": document_id
            }
            
            event_id = self.graphify.create_operational_event(event_data, provenance)
            event_ids[event_code] = event_id
            nodes_created += 1
            
            # Link to well
            if well_entity_id:
                self.graphify.link_well_event(well_entity_id, event_id, provenance)
                relations_created += 1
            
            # Link to formation
            if event.formation and event.formation in formation_ids:
                self.graphify.link_event_formation(event_id, formation_ids[event.formation], event.confidence, provenance)
                relations_created += 1
            
            # Link to document
            self.graphify.link_event_document(event_id, doc_entity_id, provenance=provenance)
            relations_created += 1
        
        # Persist the offline graph so ingested knowledge survives a restart
        if hasattr(self.graphify, "save"):
            self.graphify.save()
        
        return nodes_created, relations_created
    
    def _add_to_chromadb(self, document_id: str, document_code: str,
                          chunks: List[Dict], events: List[ExtractedEvent]) -> List[str]:
        """Add chunks and events to ChromaDB"""
        all_ids = []
        
        # Add document chunks
        if chunks:
            chunk_ids = self.chromadb.add_document_chunks(chunks)
            all_ids.extend(chunk_ids)
        
        # Add event knowledge
        if events:
            event_docs = []
            for event in events:
                if event.confidence >= settings.ingestion.event_extraction_confidence:
                    event_docs.append({
                        "event_id": f"EVT-{document_code}-{len(event_docs)}",
                        "narrative": event.source_text,
                        "well_id": "",  # Would be filled from metadata
                        "event_type": event.event_type,
                        "formation_id": event.formation or "",
                        "depth": event.depth_from or 0,
                        "severity": event.severity,
                        "mitigation": event.mitigation or "",
                        "outcome": event.outcome or "",
                        "source_document_id": document_code,
                        "confidence": event.confidence
                    })
            
            if event_docs:
                event_ids = self.chromadb.add_event_knowledge(event_docs)
                all_ids.extend(event_ids)
        
        return all_ids
    
    def _save_chunks_to_supabase(self, document_id: str, chunks: List[Dict], chromadb_ids: List[str]):
        """Save chunk references to Supabase"""
        chunk_records = []
        for i, chunk in enumerate(chunks):
            chunk_records.append({
                "document_id": document_id,
                "chunk_id": chunk.get("chunk_id", chromadb_ids[i] if i < len(chromadb_ids) else str(uuid.uuid4())),
                "chunk_index": chunk.get("chunk_index", i),
                "page_number": chunk.get("page_number"),
                "section_title": chunk.get("section_title"),
                "depth_from_md": chunk.get("depth_from"),
                "depth_to_md": chunk.get("depth_to"),
                "formation_id": chunk.get("formation_id"),
                "event_type": chunk.get("event_type"),
                "content_hash": chunk.get("content_hash"),
                "token_count": len(chunk["content"].split()),
                "confidence": chunk.get("confidence", 0.8),
                "validation_status": "PENDING_REVIEW",
                "graphify_entity_id": chunk.get("graphify_entity_id"),
            })
        
        if chunk_records:
            self.repos["chunks"].bulk_create_chunks(chunk_records)


# Convenience function
def ingest_document(file_path: str, metadata: Dict[str, Any]) -> IngestionResult:
    """Ingest a document (PDF or text)"""
    pipeline = IngestionPipeline()
    
    if file_path.lower().endswith('.pdf'):
        return pipeline.ingest_pdf(file_path, metadata)
    else:
        return pipeline.ingest_text(file_path, metadata)