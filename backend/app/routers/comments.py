"""댓글 HTTP 엔드포인트. 요청/응답 변환만 하고 규칙은 서비스에 맡긴다."""

from fastapi import APIRouter, Depends, Path, status

from app.api.dependencies import get_comment_service
from app.api.schemas import CommentCreate, CommentDelete, CommentOut
from app.services.comments import CommentService

router = APIRouter(prefix="/api", tags=["comments"])

# 글 주소(slug)는 소문자, 숫자, 하이픈만 허용한다.
Slug = Path(pattern=r"^[a-z0-9][a-z0-9-]{0,99}$")


@router.get("/posts/{slug}/comments", response_model=list[CommentOut])
def list_comments(slug: str = Slug, service: CommentService = Depends(get_comment_service)):
    return service.list(slug)


@router.post("/posts/{slug}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(body: CommentCreate, slug: str = Slug, service: CommentService = Depends(get_comment_service)):
    return service.create(slug, body.nickname, body.content, body.password)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, body: CommentDelete, service: CommentService = Depends(get_comment_service)):
    service.delete(comment_id, body.password)
