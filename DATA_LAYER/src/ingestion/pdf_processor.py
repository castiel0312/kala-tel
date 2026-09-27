"""PDF Processing and OCR for NWIS"""
import pdfplumber
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import hashlib

from src.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Configure tesseract
if settings.ocr.tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = settings.ocr.tesseract_cmd


@dataclass
class PageContent:
    """Content extracted from a single PDF page"""
    page_number: int
    text: str
    tables: List[Dict[str, Any]]
    images: List[Dict[str, Any]]
    ocr_confidence: float
    width: float
    height: float


@dataclass
class DocumentStructure:
    """Full document structure after processing"""
    document_id: str
    page_count: int
    pages: List[PageContent]
    full_text: str
    all_tables: List[Dict[str, Any]]
    metadata: Dict[str, Any]


class PDFProcessor:
    """Process PDFs with OCR, text extraction, and table detection"""
    
    def __init__(self):
        self.ocr_confidence_threshold = settings.ingestion.ocr_confidence_threshold
    
    def process_pdf(self, file_path: str, document_id: str) -> DocumentStructure:
        """Process a PDF file completely"""
        logger.info(f"Processing PDF: {file_path}")
        
        pages = []
        all_tables = []
        full_text_parts = []
        
        # Use pdfplumber for text and tables
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_content = self._process_page(page, page_num)
                pages.append(page_content)
                all_tables.extend(page_content.tables)
                full_text_parts.append(page_content.text)
        
        # Also use PyMuPDF for additional metadata and images
        doc = fitz.open(file_path)
        metadata = self._extract_metadata(doc)
        doc.close()
        
        full_text = "\n\n".join(full_text_parts)
        
        return DocumentStructure(
            document_id=document_id,
            page_count=len(pages),
            pages=pages,
            full_text=full_text,
            all_tables=all_tables,
            metadata=metadata
        )
    
    def _process_page(self, page, page_num: int) -> PageContent:
        """Process a single page"""
        # Extract text
        text = page.extract_text() or ""
        
        # Extract tables
        tables = []
        try:
            extracted_tables = page.extract_tables()
            for table_idx, table in enumerate(extracted_tables):
                if table:
                    tables.append({
                        "table_index": table_idx,
                        "page_number": page_num,
                        "rows": len(table),
                        "cols": len(table[0]) if table else 0,
                        "data": table,
                        "bbox": page.bbox
                    })
        except Exception as e:
            logger.warning(f"Table extraction failed on page {page_num}: {e}")
        
        # Extract images and OCR if needed
        images = []
        ocr_confidence = 1.0 if text.strip() else 0.0
        
        # If text is sparse, try OCR
        if len(text.strip()) < 100:
            ocr_text, ocr_conf = self._ocr_page(page)
            if ocr_conf > ocr_confidence:
                text = ocr_text
                ocr_confidence = ocr_conf
        
        return PageContent(
            page_number=page_num,
            text=text,
            tables=tables,
            images=images,
            ocr_confidence=ocr_confidence,
            width=page.width,
            height=page.height
        )
    
    def _ocr_page(self, page) -> Tuple[str, float]:
        """OCR a page using pdfplumber's image extraction"""
        try:
            # Get page as image
            im = page.to_image(resolution=300)
            pil_image = im.original
            
            # Run OCR
            ocr_data = pytesseract.image_to_data(pil_image, output_type=pytesseract.Output.DICT)
            
            # Extract text with confidence
            words = []
            confidences = []
            for i in range(len(ocr_data['text'])):
                if ocr_data['text'][i].strip():
                    words.append(ocr_data['text'][i])
                    confidences.append(ocr_data['conf'][i])
            
            text = " ".join(words)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return text, avg_confidence / 100.0
            
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return "", 0.0
    
    def _extract_metadata(self, doc: fitz.Document) -> Dict[str, Any]:
        """Extract PDF metadata"""
        meta = doc.metadata
        return {
            "title": meta.get("title", ""),
            "author": meta.get("author", ""),
            "subject": meta.get("subject", ""),
            "creator": meta.get("creator", ""),
            "producer": meta.get("producer", ""),
            "creation_date": meta.get("creationDate", ""),
            "modification_date": meta.get("modDate", ""),
            "page_count": doc.page_count,
            "is_encrypted": doc.is_encrypted,
        }
    
    def extract_tables_as_dataframe(self, tables: List[Dict]) -> List[Dict]:
        """Convert extracted tables to structured format"""
        import pandas as pd
        
        structured_tables = []
        for table in tables:
            try:
                df = pd.DataFrame(table["data"][1:], columns=table["data"][0])
                structured_tables.append({
                    "page_number": table["page_number"],
                    "table_index": table["table_index"],
                    "headers": list(df.columns),
                    "rows": df.to_dict("records"),
                    "shape": df.shape
                })
            except Exception as e:
                logger.warning(f"Failed to structure table: {e}")
        
        return structured_tables


class TextProcessor:
    """Process text files and other text-based documents"""
    
    def process_text_file(self, file_path: str, document_id: str) -> DocumentStructure:
        """Process a text file"""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Create a single "page" structure
        page = PageContent(
            page_number=1,
            text=content,
            tables=[],
            images=[],
            ocr_confidence=1.0,
            width=0,
            height=0
        )
        
        return DocumentStructure(
            document_id=document_id,
            page_count=1,
            pages=[page],
            full_text=content,
            all_tables=[],
            metadata={"file_type": "text", "source_path": file_path}
        )


def compute_content_hash(content: str) -> str:
    """Compute SHA256 hash of content"""
    return hashlib.sha256(content.encode()).hexdigest()


# =============================================================================
# DOCUMENT CHUNKER
# =============================================================================

class SemanticChunker:
    """Semantic-aware chunking for drilling documents"""
    
    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.ingestion.chunk_size
        self.chunk_overlap = chunk_overlap or settings.ingestion.chunk_overlap
        self.min_chunk_length = settings.ingestion.min_chunk_length
        self.max_chunk_length = settings.ingestion.max_chunk_length
    
    def chunk_document(self, doc_structure: DocumentStructure, 
                       document_metadata: Dict) -> List[Dict[str, Any]]:
        """Chunk a document using drilling-aware semantic chunking"""
        chunks = []
        
        # Try to identify sections first
        sections = self._identify_sections(doc_structure.full_text)
        
        if sections:
            # Chunk by sections
            for section in sections:
                section_chunks = self._chunk_section(section, document_metadata)
                chunks.extend(section_chunks)
        else:
            # Fallback to sliding window
            chunks = self._sliding_window_chunk(doc_structure.full_text, document_metadata)
        
        # Add chunk indices and IDs
        for i, chunk in enumerate(chunks):
            chunk["chunk_index"] = i
            chunk["chunk_id"] = f"{document_metadata.get('document_code', 'DOC')}_P{chunk.get('page_number', 0)}_C{i:03d}"
            chunk["content_hash"] = compute_content_hash(chunk["content"])
        
        # Filter by length
        chunks = [c for c in chunks if len(c["content"]) >= self.min_chunk_length]
        
        return chunks
    
    def _identify_sections(self, text: str) -> List[Dict[str, Any]]:
        """Identify document sections based on headers"""
        import re
        
        # Common drilling report section patterns
        section_patterns = [
            r'(?i)^(?:section|chapter)\s+\d+[.:]\s*(.+)$',
            r'(?i)^\d+[.:]\s*(.+)$',
            r'(?i)^(?:summary|introduction|background|operations|drilling|cementing|logging|completion|conclusions?|recommendations?)[.:]\s*$',
            r'(?i)^(?:daily\s+drilling\s+report|well\s+completion\s+report|geological\s+report)[.:]?\s*$',
            r'(?i)^(?:formation|interval|zone)\s+[A-Z0-9\-]+\s*$',
        ]
        
        lines = text.split('\n')
        sections = []
        current_section = {"title": "Introduction", "content": "", "start_line": 0}
        
        for i, line in enumerate(lines):
            is_header = False
            for pattern in section_patterns:
                if re.match(pattern, line.strip()):
                    is_header = True
                    break
            
            if is_header and current_section["content"].strip():
                sections.append(current_section)
                current_section = {"title": line.strip(), "content": "", "start_line": i}
            else:
                current_section["content"] += line + "\n"
        
        if current_section["content"].strip():
            sections.append(current_section)
        
        return sections
    
    def _chunk_section(self, section: Dict, document_metadata: Dict) -> List[Dict]:
        """Chunk a single section"""
        content = section["content"]
        title = section["title"]
        
        if len(content) <= self.chunk_size:
            return [{
                "content": content,
                "section_title": title,
                **document_metadata
            }]
        
        # Split large sections
        chunks = []
        words = content.split()
        start = 0
        
        while start < len(words):
            end = min(start + self.chunk_size, len(words))
            chunk_text = " ".join(words[start:end])
            
            chunks.append({
                "content": chunk_text,
                "section_title": title,
                **document_metadata
            })
            
            start += self.chunk_size - self.chunk_overlap
        
        return chunks
    
    def _sliding_window_chunk(self, text: str, document_metadata: Dict) -> List[Dict]:
        """Sliding window chunking fallback"""
        chunks = []
        words = text.split()
        start = 0
        
        while start < len(words):
            end = min(start + self.chunk_size, len(words))
            chunk_text = " ".join(words[start:end])
            
            chunks.append({
                "content": chunk_text,
                "section_title": "General",
                **document_metadata
            })
            
            start += self.chunk_size - self.chunk_overlap
        
        return chunks