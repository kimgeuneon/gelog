"""조립 지점(composition root). 포트에 어떤 구현을 끼울지는 여기서만 정한다."""

from collections.abc import Iterator

from fastapi import Request

from app.infrastructure.clock import SystemClock
from app.infrastructure.db import connect
from app.repositories.sqlite_comments import SqliteCommentRepository
from app.security.passwords import Pbkdf2PasswordHasher
from app.services.comments import CommentService

_hasher = Pbkdf2PasswordHasher()
_clock = SystemClock()


def get_comment_service(request: Request) -> Iterator[CommentService]:
    conn = connect(request.app.state.settings.database_path)
    try:
        yield CommentService(SqliteCommentRepository(conn), _hasher, _clock)
    finally:
        conn.close()
