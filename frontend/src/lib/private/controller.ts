import { exportKey, importKey, openWithKey, unlock } from './cipher.js';
import type { Envelope, KeyStore, PrivatePayload, PrivatePost } from './types';
import type { PrivateBoardView } from './view';

/** 잠금 해제·잠금·목록/글 이동 흐름. 키 저장소와 화면은 주입받는다(DIP). */
export class PrivateBoardController {
	private posts: PrivatePost[] = [];

	constructor(
		private readonly envelope: Envelope,
		private readonly keys: KeyStore,
		private readonly view: PrivateBoardView,
	) {}

	async start() {
		this.view.lockForm.addEventListener('submit', (e) => {
			e.preventDefault();
			void this.unlockWithPassword(this.view.readPassword());
		});
		this.view.relockButton.addEventListener('click', () => this.lock());
		this.view.backLink.addEventListener('click', (e) => {
			e.preventDefault();
			history.pushState(null, '', location.pathname);
			this.route();
		});
		window.addEventListener('hashchange', () => this.posts.length && this.route());
		await this.restore();
	}

	/** 같은 탭에서 이미 열었으면 다시 묻지 않는다. */
	private async restore() {
		const raw = this.keys.load();
		if (!raw) return;
		try {
			const payload = (await openWithKey(this.envelope, await importKey(raw))) as PrivatePayload;
			this.open(payload);
		} catch {
			this.keys.clear(); // 게시판이 다시 암호화되어 예전 키가 맞지 않는 경우
		}
	}

	private async unlockWithPassword(password: string) {
		this.view.setBusy(true);
		this.view.status.info('확인하는 중…');
		try {
			const { payload, key } = await unlock(this.envelope, password);
			this.keys.save(await exportKey(key));
			this.open(payload as PrivatePayload);
		} catch {
			this.view.showWrongPassword();
		} finally {
			this.view.setBusy(false);
		}
	}

	private open(payload: PrivatePayload) {
		this.posts = payload.posts;
		this.route();
	}

	private lock() {
		this.keys.clear();
		this.posts = [];
		history.replaceState(null, '', location.pathname);
		this.view.showLocked();
	}

	private route() {
		const slug = decodeURIComponent(location.hash.slice(1));
		const post = this.posts.find((p) => p.slug === slug);
		if (post) this.view.showPost(post);
		else this.view.showList(this.posts);
	}
}
