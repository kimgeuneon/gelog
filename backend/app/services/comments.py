"""댓글 유스케이스. 저장소·해시·시계는 포트로만 받는다(DIP).

이 클래스의 책임은 '댓글 규칙' 하나다(SRP):
- 작성할 때 비밀번호는 해시로만 저장한다.
- 삭제할 때는 작성 시 비밀번호가 맞아야 한다.
"""

from app.domain.comments import (
    Clock,
    Comment,
    CommentNotFound,
    CommentRepository,
    NewComment,
    PasswordHasher,
    WrongPassword,
)


class CommentService:
    def __init__(self, repo: CommentRepository, hasher: PasswordHasher, clock: Clock):
        self._repo = repo
        self._hasher = hasher
        self._clock = clock

    def list(self, post_slug: str) -> list[Comment]:
        return self._repo.list_by_slug(post_slug)

    def create(self, post_slug: str, nickname: str, content: str, password: str) -> Comment:
        return self._repo.add(
            NewComment(
                post_slug=post_slug,
                nickname=nickname,
                content=content,
                password_hash=self._hasher.hash(password),
                created_at=self._clock.now(),
            )
        )

    def delete(self, comment_id: int, password: str) -> None:
        hashed = self._repo.get_password_hash(comment_id)
        if hashed is None:
            raise CommentNotFound()
        if not self._hasher.verify(password, hashed):
            raise WrongPassword()
        self._repo.delete(comment_id)
