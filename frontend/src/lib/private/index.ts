import { PrivateBoardController } from './controller';
import { SessionKeyStore } from './key-store';
import type { Envelope } from './types';
import { PrivateBoardView } from './view';

/** 페이지에 심어 둔 봉투를 읽어 구현을 조립한다. */
export function mountPrivateBoard(root: HTMLElement) {
	const sealed = root.querySelector<HTMLScriptElement>('[data-sealed]');
	if (!sealed?.textContent) return;
	const envelope = JSON.parse(sealed.textContent) as Envelope;
	void new PrivateBoardController(envelope, new SessionKeyStore(), new PrivateBoardView(root)).start();
}
