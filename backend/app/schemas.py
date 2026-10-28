"""HTTP 입출력 형식(pydantic). 도메인 엔티티와 분리해 둔다."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CommentCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=30)
    content: str = Field(min_length=1, max_length=1000)
    password: str = Field(min_length=4, max_length=64)

    @field_validator("nickname", "content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("공백만 입력할 수 없습니다.")
        return v


class CommentDelete(BaseModel):
    password: str = Field(min_length=1, max_length=64)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_slug: str
    nickname: str
    content: str
    created_at: datetime
