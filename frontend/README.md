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

```
src/
  content/blog/        공개 글 (마크다운)
  pages/               라우트 (index, blog, about, private, rss)
  layouts/, components/ 화면 조각 (마크업과 스타일)
  styles/global.css    전역 스타일 + 공통 폼 요소 (.field, .btn-primary, .status, .panel)
  lib/
    url.ts             base 경로 처리 (withBase, postUrl). 다른 곳은 BASE_URL을 직접 쓰지 않는다
    posts.ts           글 정렬과 이전/다음 글 계산. 홈·목록·RSS·글 하단이 모두 이것을 쓴다
    dom/status.ts      상태 문구(StatusLine), 필수 요소 조회(must)
    comments/          댓글 (아래 참고)
    private/           비공개 게시판 (아래 참고)
scripts/seal-private.mjs  비공개 글 암호화
tests/                 node:test
```

### 클라이언트 코드 나누는 방식

댓글과 비공개 게시판은 같은 방식으로 나눕니다.

| 파일 | 책임 |
|---|---|
| `types.ts` | 데이터 형식과 **인터페이스**(`CommentsApi`, `KeyStore`) |
| `api.ts`, `cipher.js`, `key-store.ts` | 인터페이스의 실제 구현 (HTTP, 암호화, sessionStorage) |
| `view.ts` | DOM만 다룸. 통신·암호화는 모름 |
| `controller.ts` | 사용자 동작과 구현을 연결. 구현은 생성자로 받음 |
| `index.ts` | 조립 지점: 어떤 구현을 끼울지 결정 (`mountComments`, `mountPrivateBoard`) |

`.astro` 파일에는 마크업과 `mount…()` 호출만 남깁니다.

## 댓글

빌드할 때 `PUBLIC_API_URL`(백엔드 주소)이 있을 때만 글 하단에 댓글 영역이 나옵니다.
개발 환경은 `.env.development`에 `http://localhost:8000`이 들어 있습니다. 백엔드는 `../backend` 참고.

## 비공개 게시판 (/private)

저장소가 공개라서, 글은 **빌드 전에 암호화**하고 암호문만 커밋합니다.
브라우저가 비밀번호로 직접 복호화하므로 서버가 필요 없습니다.

- 암호화: PBKDF2-SHA256(600,000회) → AES-256-GCM. 형식은 `src/lib/private/cipher.js` 하나가 정하고, 브라우저와 seal 스크립트가 같이 씁니다.
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
