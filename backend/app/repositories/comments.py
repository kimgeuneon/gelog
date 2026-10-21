"""comments 테이블 접근. SQL은 이 파일에만 둔다."""

import sqlite3
from typing import Optional


class CommentRepository:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def list_by_slug(self, post_slug: str) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT id, post_slug, nickname, content, created_at FROM comments "
            "WHERE post_slug = ? ORDER BY id",
            (post_slug,),
        ).fetchall()

    def get(self, comment_id: int) -> Optional[sqlite3.Row]:
        return self.conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()

    def create(self, post_slug: str, nickname: str, content: str, password_hash: str, created_at: str) -> sqlite3.Row:
        cur = self.conn.execute(
            "INSERT INTO comments (post_slug, nickname, content, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (post_slug, nickname, content, password_hash, created_at),
        )
        self.conn.commit()
        return self.get(cur.lastrowid)

    def delete(self, comment_id: int) -> None:
        self.conn.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        self.conn.commit()
