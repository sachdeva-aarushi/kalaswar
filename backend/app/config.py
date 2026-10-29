from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Kalaswar Core Services"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # WhatsApp Meta / Twilio
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "kalaswar_dev_token"
    
    # AI & Speech
    OPENAI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    # Blockchain L2
    RPC_URL: str = "https://polygon-rpc.com"
    DPP_CONTRACT_ADDRESS: str = ""
    MERKLE_BATCH_SIZE: int = 500

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
