from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DB_URL: str = "sqlite:///./eom.db"
    SECRET_KEY: str = "eom_enterprise_super_secret_jwt_key_2026_production_sec_harden_9876"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    JWT_EXPIRATION_MINUTES: int = 120  # 2 hours production standard (replaces previous 7 days)
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: int = 15
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 60
    
    def get_cors_origins(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

