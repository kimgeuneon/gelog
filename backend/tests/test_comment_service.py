"""CommentService 단위 테스트. DB 없이 가짜 포트 구현만 주입한다."""

from datetime import datetime, timezone

import pytest

from app.domain.comments import Comment, CommentNotFound, NewComment, WrongPassword
from app.security.passwords import Pbkdf2PasswordHasher
from app.services.comments import CommentService

FIXED = datetime(2026, 10, 28, 12, 0, tzinfo=timezone.utc)


class FixedClock:
    def now(self) -> datetime:
        return FIXED


class PlainHasher:
    """테스트용: 해시 대신 접두사만 붙인다."""

    def hash(self, password: str) -> str:
        return f"h:{password}"

    def verify(self, password: str, hashed: str) -> bool:
        return hashed == f"h:{password}"


class InMemoryRepo:
    def __init__(self):
        self.rows: dict[int, tuple[Comment, str]] = {}

    def list_by_slug(self, post_slug):
        return [c for c, _ in self.rows.values() if c.post_slug == post_slug]

    def get(self, comment_id):
        row = self.rows.get(comment_id)
        return row[0] if row else None

    def get_password_hash(self, comment_id):
        row = self.rows.get(comment_id)
        return row[1] if row else None

    def add(self, c: NewComment):
        cid = len(self.rows) + 1
        comment = Comment(cid, c.post_slug, c.nickname, c.content, c.created_at)
        self.rows[cid] = (comment, c.password_hash)
        return comment

    def delete(self, comment_id):
        self.rows.pop(comment_id, None)


@pytest.fixture
def repo():
    return InMemoryRepo()


@pytest.fixture
def service(repo):
    return CommentService(repo, PlainHasher(), FixedClock())


def test_create_stores_hash_and_uses_clock(service, repo):
    c = service.create("a-post", "근언", "안녕", "pw1234")
    assert c.created_at == FIXED
    assert repo.get_password_hash(c.id) == "h:pw1234"


def test_list_filters_by_slug(service):
    service.create("a", "n", "1", "pw1234")
    service.create("b", "n", "2", "pw1234")
    assert [c.content for c in service.list("a")] == ["1"]


def test_delete_requires_matching_password(service, repo):
    c = service.create("a", "n", "x", "pw1234")
    with pytest.raises(WrongPassword):
        service.delete(c.id, "nope")
    service.delete(c.id, "pw1234")
    assert repo.get(c.id) is None


def test_delete_missing_comment(service):
    with pytest.raises(CommentNotFound):
        service.delete(999, "pw1234")


def test_pbkdf2_hasher_roundtrip_and_bad_format():
    h = Pbkdf2PasswordHasher(iterations=1_000)
    hashed = h.hash("secret")
    assert "secret" not in hashed and h.verify("secret", hashed)
    assert not h.verify("other", hashed)
    assert not h.verify("secret", "not-a-valid-hash")
