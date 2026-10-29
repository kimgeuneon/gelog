import { BOARD_FILE } from './files.js';
import type { BoardSource, Envelope, SealedPart } from './types';

/** 정적 파일로 배포된 봉투를 fetch로 가져온다. */
export class StaticBoardSource implements BoardSource {
	constructor(private readonly baseUrl: string) {}

	async loadBoard(): Promise<Envelope | null> {
		const res = await fetch(this.url(BOARD_FILE));
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`게시판을 불러오지 못했습니다. (${res.status})`);
		return res.json();
	}

	async loadPart(file: string): Promise<SealedPart> {
		const res = await fetch(this.url(file));
		if (!res.ok) throw new Error(`파일을 불러오지 못했습니다. (${res.status})`);
		return res.json();
	}

	private url(file: string) {
		return `${this.baseUrl.replace(/\/$/, '')}/${file}`;
	}
}
