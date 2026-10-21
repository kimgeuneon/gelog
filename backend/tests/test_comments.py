import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    settings = Settings(database_path=tmp_path / "test.db", allowed_origins=["http://localhost:4321"])
    with TestClient(create_app(settings)) as c:
        yield c


def post(client, slug="hello-world", **kw):
    body = {"nickname": "근언", "content": "첫 댓글", "password": "1234", **kw}
    return client.post(f"/api/posts/{slug}/comments", json=body)


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_create_and_list(client):
    r = post(client)
    assert r.status_code == 201
    c = r.json()
    assert c["nickname"] == "근언" and c["content"] == "첫 댓글" and c["post_slug"] == "hello-world"
    assert "password" not in c and "password_hash" not in c

    listed = client.get("/api/posts/hello-world/comments").json()
    assert [x["id"] for x in listed] == [c["id"]]


def test_comments_are_separated_by_post(client):
    post(client, slug="a-post")
    post(client, slug="b-post")
    assert len(client.get("/api/posts/a-post/comments").json()) == 1
    assert client.get("/api/posts/c-post/comments").json() == []


def test_list_is_oldest_first(client):
    ids = [post(client, content=f"댓글 {i}").json()["id"] for i in range(3)]
    assert [x["id"] for x in client.get("/api/posts/hello-world/comments").json()] == ids


@pytest.mark.parametrize(
    "override",
    [{"nickname": ""}, {"nickname": "   "}, {"content": ""}, {"content": "x" * 1001}, {"password": "123"}],
)
def test_validation(client, override):
    assert post(client, **override).status_code == 422


def test_invalid_slug_rejected(client):
    assert client.get("/api/posts/Bad_Slug/comments").status_code == 422


def test_delete_with_password(client):
    cid = post(client).json()["id"]
    assert client.request("DELETE", f"/api/comments/{cid}", json={"password": "wrong"}).status_code == 403
    assert client.request("DELETE", f"/api/comments/{cid}", json={"password": "1234"}).status_code == 204
    assert client.get("/api/posts/hello-world/comments").json() == []
    assert client.request("DELETE", f"/api/comments/{cid}", json={"password": "1234"}).status_code == 404


def test_password_is_hashed(client, tmp_path):
    import sqlite3

    post(client, password="secret-pw")
    stored = sqlite3.connect(tmp_path / "test.db").execute("SELECT password_hash FROM comments").fetchone()[0]
    assert "secret-pw" not in stored and "$" in stored


def test_cors_allows_blog_origin(client):
    r = client.options(
        "/api/posts/hello-world/comments",
        headers={"Origin": "http://localhost:4321", "Access-Control-Request-Method": "POST"},
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:4321"
