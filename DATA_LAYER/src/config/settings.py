"""NWIS Configuration Management"""
import os
from pathlib import Path
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

# Keep downloaded model weights inside the project, never the user-wide cache.
for _cache_var, _cache_dir in (
    ("HF_HOME", PROJECT_ROOT / "models" / "huggingface"),
    ("SENTENCE_TRANSFORMERS_HOME", PROJECT_ROOT / "models" / "sentence-transformers"),
    ("TORCH_HOME", PROJECT_ROOT / "models" / "torch"),
):
    os.environ.setdefault(_cache_var, str(_cache_dir))
    Path(_cache_dir).mkdir(parents=True, exist_ok=True)


def _config(prefix: str = "", **extra) -> SettingsConfigDict:
    """Every settings section reads the same single .env file."""
    return SettingsConfigDict(
        env_prefix=prefix,
        env_file=ENV_FILE if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        **extra,
    )


class SupabaseSettings(BaseSettings):
    model_config = _config("SUPABASE_")
    
    url: str = "https://placeholder.supabase.co"
    anon_key: str = "placeholder-anon-key"
    service_role_key: str = "placeholder-service-key"
    jwt_secret: str = "placeholder-jwt-secret"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "postgres"
    db_user: str = "postgres"
    db_password: str = ""
    storage_bucket: str = "well-documents"
    storage_public_url: str = ""


class ChromaDBSettings(BaseSettings):
    model_config = _config("CHROMADB_")
    
    mode: str = "persistent"
    host: str = "localhost"
    port: int = 8001
    persist_dir: str = str(PROJECT_ROOT / "data" / "chromadb")
    api_key: Optional[str] = None
    tenant: Optional[str] = None
    database: Optional[str] = None


class Neo4jSettings(BaseSettings):
    model_config = _config("NEO4J_")
    
    uri: str = "bolt://localhost:7687"
    user: str = "neo4j"
    password: str = "password"
    database: str = "neo4j"


class GraphSettings(BaseSettings):
    """Knowledge-graph backend selection.

    local - NetworkX graph persisted to disk (fully offline, default)
    neo4j - Neo4j server (local or Aura)
    auto  - local, upgraded to Neo4j when it is reachable
    """

    model_config = _config("GRAPH_")

    backend: str = "auto"


class EmbeddingSettings(BaseSettings):
    model_config = _config("EMBEDDING_")
    
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    device: str = "cpu"
    batch_size: int = 32
    max_length: int = 512


class OCRSettings(BaseSettings):
    model_config = _config("")
    
    tesseract_cmd: str = Field(default="tesseract", validation_alias="TESSERACT_CMD")
    paddleocr_use_gpu: bool = Field(default=False, validation_alias="PADDLEOCR_USE_GPU")
    paddleocr_lang: str = Field(default="en", validation_alias="PADDLEOCR_LANG")
    paddleocr_det_model_dir: Optional[str] = Field(default=None, validation_alias="PADDLEOCR_DET_MODEL_DIR")
    paddleocr_rec_model_dir: Optional[str] = Field(default=None, validation_alias="PADDLEOCR_REC_MODEL_DIR")


class NLPSettings(BaseSettings):
    model_config = _config("")
    
    spacy_model: str = Field(default="en_core_web_lg", validation_alias="SPACY_MODEL")


class ERTMACSettings(BaseSettings):
    model_config = _config("ERTMAC_")
    
    api_endpoint: str = "http://localhost:8080/api/v1"
    ws_endpoint: str = "ws://localhost:8080/ws"
    api_key: Optional[str] = None
    poll_interval_seconds: int = 5


class InfluxDBSettings(BaseSettings):
    model_config = _config("INFLUXDB_")
    
    url: str = "http://localhost:8086"
    token: Optional[str] = None
    org: Optional[str] = None
    bucket: str = "drilling-data"


class AppSettings(BaseSettings):
    model_config = _config("APP_")
    
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    log_level: str = "INFO"
    secret_key: str = Field(default="change-me", validation_alias="API_SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, validation_alias="API_ACCESS_TOKEN_EXPIRE_MINUTES")
    algorithm: str = Field(default="HS256", validation_alias="API_ALGORITHM")
    cors_origins: List[str] = Field(default=["http://localhost:3000"], validation_alias="CORS_ORIGINS")


class RetrievalSettings(BaseSettings):
    model_config = _config("RETRIEVAL_")
    
    weight_graph: float = 0.30
    weight_vector: float = 0.30
    weight_sql: float = 0.20
    weight_spatial: float = 0.10
    weight_depth: float = 0.10
    default_search_radius_km: float = 5.0
    default_depth_tolerance_m: int = 50
    default_top_k: int = 20
    rerank_top_k: int = 10


class IngestionSettings(BaseSettings):
    model_config = _config("")
    
    chunk_size: int = Field(default=512, validation_alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=50, validation_alias="CHUNK_OVERLAP")
    min_chunk_length: int = Field(default=100, validation_alias="MIN_CHUNK_LENGTH")
    max_chunk_length: int = Field(default=2000, validation_alias="MAX_CHUNK_LENGTH")
    ocr_confidence_threshold: float = Field(default=0.7, validation_alias="OCR_CONFIDENCE_THRESHOLD")
    entity_extraction_confidence: float = Field(default=0.8, validation_alias="ENTITY_EXTRACTION_CONFIDENCE")
    relation_extraction_confidence: float = Field(default=0.75, validation_alias="RELATION_EXTRACTION_CONFIDENCE")
    event_extraction_confidence: float = Field(default=0.8, validation_alias="EVENT_EXTRACTION_CONFIDENCE")
    require_engineer_validation: bool = Field(default=True, validation_alias="REQUIRE_ENGINEER_VALIDATION")
    auto_validate_high_confidence: float = Field(default=0.95, validation_alias="AUTO_VALIDATE_HIGH_CONFIDENCE")


class FeatureFlags(BaseSettings):
    model_config = _config("ENABLE_")
    
    real_time_alerts: bool = True
    graph_expansion: bool = True
    semantic_search: bool = True
    llm_rag: bool = True
    analogue_matching: bool = True


class SQLSettings(BaseSettings):
    model_config = _config("SQL_")
    
    backend: str = "local"
    local_path: str = str(PROJECT_ROOT / "data" / "nwis.db")


class Settings(BaseSettings):
    model_config = _config()
    
    supabase: SupabaseSettings = SupabaseSettings()
    chromadb: ChromaDBSettings = ChromaDBSettings()
    neo4j: Neo4jSettings = Neo4jSettings()
    graph: GraphSettings = GraphSettings()
    embedding: EmbeddingSettings = EmbeddingSettings()
    ocr: OCRSettings = OCRSettings()
    nlp: NLPSettings = NLPSettings()
    ertmac: ERTMACSettings = ERTMACSettings()
    influxdb: InfluxDBSettings = InfluxDBSettings()
    app: AppSettings = AppSettings()
    retrieval: RetrievalSettings = RetrievalSettings()
    ingestion: IngestionSettings = IngestionSettings()
    features: FeatureFlags = FeatureFlags()
    sql: SQLSettings = SQLSettings()
    
    # Paths
    base_dir: Path = PROJECT_ROOT
    data_dir: Path = PROJECT_ROOT / "data"
    log_dir: Path = PROJECT_ROOT / "logs"
    models_dir: Path = PROJECT_ROOT / "models"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    return settings