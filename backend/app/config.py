from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_database: str = "seekmakan"
    mongodb_timeout_ms: int = 5000
    geoapify_api_key: SecretStr = SecretStr("")
    mailjet_api_key: SecretStr = SecretStr("")
    mailjet_secret_key: SecretStr = SecretStr("")
    mailjet_sender_email: str = ""
    mailjet_sender_name: str = "SeekMakan"
    session_cookie_secure: bool = True

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra = "ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

settings = Settings() # type: ignore