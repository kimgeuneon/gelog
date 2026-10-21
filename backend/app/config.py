"""환경 변수로 바꿀 수 있는 설정."""

import os
from dataclasses import dataclass, field
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "comments.db"
DEFAULT_ORIGINS = "http://localhost:4321,https://kimgeuneon.github.io"


@dataclass(frozen=True)
class Settings:
    database_path: Path = field(default_factory=lambda: Path(os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)))
    allowed_origins: list[str] = field(
        default_factory=lambda: [
            o.strip() for o in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()
        ]
    )
