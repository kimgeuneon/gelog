# gelog frontend

Astro 정적 사이트. `main`에 푸시하면 GitHub Actions가 빌드해서 https://gelog.co.kr 에 배포합니다.

## 명령

```bash
npm run dev     # 개발 서버 (http://localhost:4321)
npm run build   # dist/ 로 빌드
npm test        # 비공개 게시판 암호화 테스트 (node:test)
npm run seal    # 비공개 게시판 글을 암호화
```

## 구조

기능 단위로 묶습니다. 한 기능의 로직(`lib/`)과 화면(`ui/`)이 같은 폴더에 있고,
여러 기능이 같이 쓰는 것만 `shared/`에 둡니다. 폴더 밖을 가리킬 때는 `@/` 별칭을 씁니다.

```
src/
  config/site.ts            사이트 제목·설명
  content/blog/             공개 글 (마크다운)
  pages/                    라우트 (index, blog, about, private, rss)
  layouts/                  페이지 틀
  components/               사이트 공통 Astro 조각 (헤더, 푸터, 카드, 글 하단 내비)
  styles/global.css         전역 스타일 + 공통 폼 요소 (.field, .btn-primary, .status, .panel)
  shared/
    lib/url.ts              base 경로 처리 (withBase, postUrl). 다른 곳은 BASE_URL을 직접 쓰지 않는다
    lib/posts.ts            글 정렬과 이전/다음 글 계산. 홈·목록·RSS·글 하단이 모두 이것을 쓴다
    ui/status.ts            폼 상태 문구 값 (info, failure)
    ui/StatusLine.tsx       그 값을 그리는 React 컴포넌트
  features/
    comments/               댓글 (아래 참고)
    private-board/          비공개 게시판 (아래 참고)
scripts/seal-private.mjs    비공개 글 암호화
tests/                      node:test
```

### 기능 폴더 나누는 방식

댓글과 비공개 게시판은 같은 방식으로 나눕니다. 의존 방향은 `ui → lib → shared` 한쪽뿐입니다.

| 위치 | 책임 |
|---|---|
| `lib/types.ts` | 데이터 형식과 **인터페이스**(`CommentsApi`, `KeyStore`) |
| `lib/api.ts`, `lib/cipher.js`, `lib/key-store.ts` | 인터페이스의 실제 구현 (HTTP, 암호화, sessionStorage) |
| `lib/use*.ts` | 상태와 동작을 담은 React 훅. 구현은 **인자로 받는다** |
| `ui/*Island.tsx` | 조립 지점: 어떤 구현을 끼울지 결정하고 아래로 넘긴다 |
| `ui/` 나머지 | 받은 값을 그리기만 하는 컴포넌트 |
| `*.astro` | 마크업·스타일과 `<…Island client:… />` 호출만 |

## 댓글

빌드할 때 `PUBLIC_API_URL`(백엔드 주소)이 있을 때만 글 하단에 댓글 영역이 나옵니다.
개발 환경은 `.env.development`에 `http://localhost:8000`이 들어 있습니다. 백엔드는 `../backend` 참고.

## 비공개 게시판 (/private)

저장소가 공개라서, 글은 **빌드 전에 암호화**하고 암호문만 커밋합니다.
브라우저가 비밀번호로 직접 복호화하므로 서버가 필요 없습니다.

- 암호화: PBKDF2-SHA256(600,000회) → AES-256-GCM. 형식은 `src/features/private-board/lib/cipher.js` 하나가 정하고, 브라우저와 seal 스크립트가 같이 씁니다.
- 원본 글: `private/*.md` (gitignore, 커밋되지 않음)
- 암호문: `src/data/private.sealed.json` (커밋)
- 한 번 열면 같은 탭에서는 다시 묻지 않고, "잠그기"나 탭을 닫으면 다시 잠깁니다.
- 검색 엔진 제외(noindex), 사이트맵 제외.

글 쓰는 법:

```md
<!-- private/발표자료.md -->
---
title: '발표 자료'
description: '한 줄 설명'
pubDate: '2026-10-28'
---

본문 (마크다운)
```

```bash
npm run seal          # 비밀번호 입력 (8자 이상)
git add src/data/private.sealed.json && git commit -m "Update private board" && git push
```

비밀번호를 바꾸려면 새 비밀번호로 다시 `npm run seal` 하면 됩니다.
비밀번호가 약하면 암호문을 받아 간 사람이 대입 공격을 할 수 있으니 길게 정하세요.
