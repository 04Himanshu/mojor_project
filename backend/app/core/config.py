from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_URL: str = "sqlite:///./eom.db"
    
    class Config:
        env_file = ".env"

settings = Settings()
