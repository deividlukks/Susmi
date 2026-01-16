from pydantic_settings import BaseSettings
from typing import Optional, Literal


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

    # LLM Configuration
    LLM_PROVIDER: Literal["openai", "anthropic"] = "anthropic"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "claude-3-5-sonnet-20241022"
    LLM_MAX_TOKENS: int = 4096
    LLM_TEMPERATURE: float = 0.7
    ENABLE_LLM_FEATURES: bool = True

    class Config:
        env_file = ["../../.env", ".env"]
        case_sensitive = True


settings = Settings()
