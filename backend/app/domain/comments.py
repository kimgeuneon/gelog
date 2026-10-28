"""댓글 도메인: 엔티티, 도메인 오류, 그리고 바깥 계층이 구현할 포트(Protocol).

이 모듈은 FastAPI, SQLite, hashlib 같은 구체 기술을 모른다.
서비스는 여기 정의된 추상(포트)에만 의존하고, 구현은 바깥에서 주입한다(DIP).
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


# ── 엔티티 ──────────────────────────────────────────────


@dataclass(frozen=True)
class Comment:
    """저장된 댓글. 비밀번호 해시는 밖으로 나가지 않도록 따로 둔다."""

    id: int
    post_slug: str
    nickname: str
    content: str
    created_at: datetime


@dataclass(frozen=True)
class NewComment:
    """저장 직전의 댓글. 비밀번호는 이미 해시된 상태다."""

    post_slug: str
    nickname: str
    content: str
    password_hash: str
    created_at: datetime


# ── 도메인 오류 (HTTP를 모른다. 상태 코드 변환은 api 계층이 맡는다) ──


class DomainError(Exception):
    """도메인 규칙 위반의 공통 부모."""


class CommentNotFound(DomainError):
    pass


class WrongPassword(DomainError):
    pass


# ── 포트 (ISP: 각자 필요한 만큼만 작게) ─────────────────────


class CommentRepository(Protocol):
    def list_by_slug(self, post_slug: str) -> list[Comment]: ...

    def get_password_hash(self, comment_id: int) -> str | None: ...

    def add(self, comment: NewComment) -> Comment: ...

    def delete(self, comment_id: int) -> None: ...


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, password: str, hashed: str) -> bool: ...


class Clock(Protocol):
    def now(self) -> datetime: ...
