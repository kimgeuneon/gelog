"""댓글 규칙: 비밀번호 해시와 삭제 권한 확인."""

import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from app.repositories.comments import CommentRepository
from app.schemas import CommentCreate, CommentOut

_ITERATIONS = 200_000


class CommentNotFound(Exception):
    pass


class WrongPassword(Exception):
    pass


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$", 1)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), _ITERATIONS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def _to_out(row) -> CommentOut:
    return CommentOut(
        id=row["id"],
        post_slug=row["post_slug"],
        nickname=row["nickname"],
        content=row["content"],
        created_at=row["created_at"],
    )


class CommentService:
    def __init__(self, repo: CommentRepository):
        self.repo = repo

    def list(self, post_slug: str) -> list[CommentOut]:
        return [_to_out(r) for r in self.repo.list_by_slug(post_slug)]

    def create(self, post_slug: str, data: CommentCreate) -> CommentOut:
        row = self.repo.create(
            post_slug=post_slug,
            nickname=data.nickname,
            content=data.content,
            password_hash=hash_password(data.password),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        return _to_out(row)

    def delete(self, comment_id: int, password: str) -> None:
        row = self.repo.get(comment_id)
        if row is None:
            raise CommentNotFound()
        if not verify_password(password, row["password_hash"]):
            raise WrongPassword()
        self.repo.delete(comment_id)
