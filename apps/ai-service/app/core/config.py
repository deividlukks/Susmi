from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_DEBUG: bool = True
    API_SECRET_KEY: str = "your-secret-key-change-in-production"

    # NestJS API
    NESTJS_API_URL: str = "http://localhost:3001/api"

    # AI/ML Configuration
    MODEL_PATH: str = "./models"
    ENABLE_AI_FEATURES: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
