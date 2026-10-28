"""CommentRepository의 SQLite 구현. SQL과 행(row) 변환은 이 파일에만 둔다."""

import sqlite3
from datetime import datetime

from app.domain.comments import Comment, NewComment

_PUBLIC_COLUMNS = "id, post_slug, nickname, content, created_at"


def _to_comment(row: sqlite3.Row) -> Comment:
    return Comment(
        id=row["id"],
        post_slug=row["post_slug"],
        nickname=row["nickname"],
        content=row["content"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )


class SqliteCommentRepository:
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def list_by_slug(self, post_slug: str) -> list[Comment]:
        rows = self._conn.execute(
            f"SELECT {_PUBLIC_COLUMNS} FROM comments WHERE post_slug = ? ORDER BY id",
            (post_slug,),
        ).fetchall()
        return [_to_comment(r) for r in rows]

    def get(self, comment_id: int) -> Comment | None:
        row = self._conn.execute(
            f"SELECT {_PUBLIC_COLUMNS} FROM comments WHERE id = ?", (comment_id,)
        ).fetchone()
        return _to_comment(row) if row else None

    def get_password_hash(self, comment_id: int) -> str | None:
        row = self._conn.execute(
            "SELECT password_hash FROM comments WHERE id = ?", (comment_id,)
        ).fetchone()
        return row["password_hash"] if row else None

    def add(self, comment: NewComment) -> Comment:
        cur = self._conn.execute(
            "INSERT INTO comments (post_slug, nickname, content, password_hash, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                comment.post_slug,
                comment.nickname,
                comment.content,
                comment.password_hash,
                comment.created_at.isoformat(),
            ),
        )
        self._conn.commit()
        created = self.get(cur.lastrowid)
        assert created is not None
        return created

    def delete(self, comment_id: int) -> None:
        self._conn.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        self._conn.commit()
