# gelog backend

블로그 댓글 API (FastAPI + SQLite).

## 구조

```
app/
  main.py           앱 생성, CORS, 라우터 연결
  config.py         환경 변수 설정
  db.py             SQLite 연결과 스키마
  schemas.py        요청/응답 형식 (pydantic)
  routers/          HTTP 엔드포인트
  services/         규칙 (비밀번호 해시, 삭제 권한 확인)
  repositories/     SQL 접근
tests/              pytest
```

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
