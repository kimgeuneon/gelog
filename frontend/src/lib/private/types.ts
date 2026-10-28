export type PrivatePost = {
	slug: string;
	title: string;
	description: string;
	pubDate: string;
	html: string;
	/** 발표 슬라이드(HTML 문서 하나). 있으면 글 안에 iframe으로 띄운다. */
	deck?: string;
};

export type PrivatePayload = { posts: PrivatePost[] };

export type Envelope = { v: number; kdf: string; iterations: number; salt: string; iv: string; data: string };

/** 열린 키를 어디에 둘지에 대한 추상. 지금은 탭 세션, 필요하면 다른 저장소로 바꿀 수 있다. */
export interface KeyStore {
	load(): string | null;
	save(rawKey: string): void;
	clear(): void;
}
