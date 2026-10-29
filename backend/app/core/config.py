from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Kalaswar Core Services"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ]

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "kalaswar_development_jwt_secret_32_bytes_long_min"

    # Internal Service Tokens for Teammates (e.g., WhatsApp bot, Edge QC)
    INTERNAL_SERVICE_TOKEN: str = "kalaswar_internal_service_secret_token"
    WHATSAPP_SHARED_SERVICE_TOKEN: str = "kalaswar_internal_service_secret_token"

    # WhatsApp Business API (Meta Cloud / BSP)
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "kalaswar_dev_token"

    # AI & Speech Services
    OPENAI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""

    # Cloudinary Media Pipeline
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Blockchain L2 Provenance
    RPC_URL: str = "https://polygon-rpc.com"
    DPP_CONTRACT_ADDRESS: str = ""
    MERKLE_BATCH_SIZE: int = 500

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
