// 암호화 파일 이름 규칙. seal 스크립트(쓰기)와 브라우저(읽기)가 같이 쓴다.

/** 글 목록·본문 봉투. 이름이 고정이라 페이지가 항상 같은 주소로 받는다. */
export const BOARD_FILE = 'board.sealed.json';

/**
 * 발표 파일 이름. 내용 해시를 넣어, CDN에 남은 옛 파일과 새 게시판이 섞이지 않게 한다.
 * @param {string} slug
 * @param {string} hash
 */
export const deckFileName = (slug, hash) => `${slug}.${hash}.deck.sealed.json`;
