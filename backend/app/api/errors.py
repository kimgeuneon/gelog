"""도메인 오류 → HTTP 응답 변환을 한 곳에서 한다.

새 도메인 오류가 생기면 표에 한 줄만 추가하면 되고, 라우터는 고치지 않는다(OCP).
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.comments import CommentNotFound, DomainError, WrongPassword

ERROR_RESPONSES: dict[type[DomainError], tuple[int, str]] = {
    CommentNotFound: (status.HTTP_404_NOT_FOUND, "댓글을 찾을 수 없습니다."),
    WrongPassword: (status.HTTP_403_FORBIDDEN, "비밀번호가 맞지 않습니다."),
}


def register_error_handlers(app: FastAPI) -> None:
    for error_type, (code, detail) in ERROR_RESPONSES.items():

        async def handler(_: Request, __: Exception, code: int = code, detail: str = detail):
            return JSONResponse(status_code=code, content={"detail": detail})

        app.add_exception_handler(error_type, handler)
