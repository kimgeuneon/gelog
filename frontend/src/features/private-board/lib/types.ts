export type PrivatePost = {
	slug: string;
	title: string;
	description: string;
	pubDate: string;
	html: string;
	/** 발표 슬라이드가 따로 암호화된 파일 이름. 글을 열 때만 받는다. */
	deckFile?: string;
};

export type PrivatePayload = { posts: PrivatePost[] };

/** 게시판 봉투. 비밀번호에서 키를 만들 정보(salt, iterations)가 들어 있다. */
export type Envelope = { v: number; kdf: string; iterations: number; salt: string; iv: string; data: string };

/** 부속 파일 봉투. 게시판과 같은 키로 연다. */
export type SealedPart = { v: number; iv: string; data: string };

/** 열린 키를 어디에 둘지에 대한 추상. 지금은 탭 세션, 필요하면 다른 저장소로 바꿀 수 있다. */
export interface KeyStore {
	load(): string | null;
	save(rawKey: string): void;
	clear(): void;
}

/** 암호화된 파일을 어디서 가져올지에 대한 추상. 지금은 같은 사이트의 정적 파일. */
export interface BoardSource {
	/** 게시판 봉투. 아직 글이 없으면 null. */
	loadBoard(): Promise<Envelope | null>;
	loadPart(file: string): Promise<SealedPart>;
}
