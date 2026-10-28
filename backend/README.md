# gelog backend

블로그 댓글 API (FastAPI + SQLite).

## 구조

SOLID 원칙에 맞춰 계층을 나눴습니다. 안쪽(domain)은 바깥(FastAPI, SQLite)을 모릅니다.

```
app/
  domain/comments.py      엔티티, 도메인 오류, 포트(Protocol: 저장소·해시·시계)
  services/comments.py    댓글 규칙. 포트에만 의존 (DIP)
  infrastructure/         포트의 구현: SQLite 저장소(SQL은 여기에만), PBKDF2 해시, DB 연결·스키마, 시스템 시계
  api/dependencies.py     조립 지점: 포트에 어떤 구현을 끼울지 결정
  api/errors.py           도메인 오류 → HTTP 상태 코드 표 (OCP)
  api/schemas.py          HTTP 입출력 형식 (pydantic)
  routers/                HTTP 엔드포인트 (요청/응답 변환만)
  config.py, main.py      설정, 앱 생성
tests/
  test_comments.py        API 통합 테스트 (실제 SQLite)
  test_comment_service.py 서비스 단위 테스트 (가짜 포트 주입, DB 없음)
```

- **새 저장소**(예: PostgreSQL): `CommentRepository`를 따르는 클래스를 만들고 `api/dependencies.py`만 바꿉니다.
- **새 도메인 오류**: `DomainError`를 상속하고 `api/errors.py` 표에 한 줄 추가합니다. 라우터는 그대로입니다.

## 실행

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 테스트: `.venv/bin/python -m pytest`

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 |
| GET | `/api/posts/{slug}/comments` | 글의 댓글 목록 (오래된 순) |
| POST | `/api/posts/{slug}/comments` | 댓글 작성 `{nickname, content, password}` |
| DELETE | `/api/comments/{id}` | 댓글 삭제 `{password}` |

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_PATH` | `backend/data/comments.db` | SQLite 파일 경로 |
| `ALLOWED_ORIGINS` | `http://localhost:4321,https://gelog.co.kr,https://www.gelog.co.kr` | CORS 허용 출처 (쉼표 구분) |

## 프론트엔드 연결

프론트엔드는 빌드할 때 `PUBLIC_API_URL`로 이 서버 주소를 받습니다.
값이 없으면 댓글 영역을 그리지 않습니다.

- 개발: `frontend/.env.development`에 `http://localhost:8000`이 들어 있습니다.
- 운영: 백엔드를 배포한 뒤 빌드 환경에 `PUBLIC_API_URL`을 넣어야 합니다.
