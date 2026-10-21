"""댓글 HTTP 엔드포인트."""

from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status

from app.db import connect
from app.repositories.comments import CommentRepository
from app.schemas import CommentCreate, CommentDelete, CommentOut
from app.services.comments import CommentNotFound, CommentService, WrongPassword

router = APIRouter(prefix="/api", tags=["comments"])

# 글 주소(slug)는 소문자, 숫자, 하이픈만 허용한다.
Slug = Path(pattern=r"^[a-z0-9][a-z0-9-]{0,99}$")


def get_service(request: Request) -> Iterator[CommentService]:
    conn = connect(request.app.state.settings.database_path)
    try:
        yield CommentService(CommentRepository(conn))
    finally:
        conn.close()


@router.get("/posts/{slug}/comments", response_model=list[CommentOut])
def list_comments(slug: str = Slug, service: CommentService = Depends(get_service)):
    return service.list(slug)


@router.post("/posts/{slug}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(body: CommentCreate, slug: str = Slug, service: CommentService = Depends(get_service)):
    return service.create(slug, body)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, body: CommentDelete, service: CommentService = Depends(get_service)):
    try:
        service.delete(comment_id, body.password)
    except CommentNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "댓글을 찾을 수 없습니다.")
    except WrongPassword:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "비밀번호가 맞지 않습니다.")
