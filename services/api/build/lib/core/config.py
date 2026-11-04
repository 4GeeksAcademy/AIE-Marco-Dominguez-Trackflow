from pathlib import Path

from pydantic import AnyHttpUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve the repository root so settings work from any API working directory.
REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Keep signing secrets out of reprs and require a sufficiently long value.
    secret_key: SecretStr = Field(min_length=32)
    access_token_expire_minutes: int = Field(default=30, gt=0)
    resend_api_key: SecretStr | None = None
    email_from: str | None = None
    password_reset_url: AnyHttpUrl | None = None
    password_reset_token_expire_minutes: int = Field(default=30, ge=15, le=60)


# Validate configuration once at startup, before the API accepts requests.
settings = Settings()
