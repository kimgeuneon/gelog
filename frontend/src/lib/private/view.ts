import { must, StatusLine } from '../dom/status';
import type { PrivatePost } from './types';

/** 비공개 게시판의 화면만 다룬다. 암호화와 저장소는 모른다(SRP). */
export class PrivateBoardView {
	readonly lockForm: HTMLFormElement;
	readonly relockButton: HTMLButtonElement;
	readonly backLink: HTMLAnchorElement;
	readonly status: StatusLine;
	private readonly password: HTMLInputElement;
	private readonly unlockButton: HTMLButtonElement;
	private readonly board: HTMLElement;
	private readonly title: HTMLElement;
	private readonly list: HTMLElement;
	private readonly post: HTMLElement;
	private readonly back: HTMLElement;

	constructor(root: HTMLElement) {
		this.lockForm = must(root, '[data-lock]');
		this.password = must(this.lockForm, 'input[type="password"]');
		this.unlockButton = must(this.lockForm, 'button[type="submit"]');
		this.status = new StatusLine(must(root, '[data-status]'));
		this.board = must(root, '[data-board]');
		this.title = must(root, '[data-board-title]');
		this.relockButton = must(root, '[data-relock]');
		this.list = must(root, '[data-list]');
		this.post = must(root, '[data-post]');
		this.back = must(root, '[data-back-wrap]');
		this.backLink = must(root, '[data-back]');
	}

	readPassword() {
		return this.password.value;
	}

	setBusy(busy: boolean) {
		this.unlockButton.disabled = busy;
	}

	showLocked() {
		this.list.replaceChildren();
		this.post.replaceChildren();
		this.board.hidden = true;
		this.lockForm.hidden = false;
		this.password.focus();
	}

	showWrongPassword() {
		this.status.error('비밀번호가 맞지 않습니다.');
		this.password.select();
	}

	showList(posts: PrivatePost[]) {
		this.unlocked();
		this.title.textContent = `글 목록 (${posts.length})`;
		if (posts.length) this.list.replaceChildren(...posts.map(card));
		else this.list.textContent = '아직 글이 없습니다.';
		this.toggle(false);
	}

	showPost(post: PrivatePost) {
		this.unlocked();
		this.title.textContent = post.title;
		// 내가 쓴 글을 빌드 때 HTML로 바꾼 것이라 그대로 넣는다.
		this.post.innerHTML = post.html;
		this.toggle(true);
	}

	private unlocked() {
		this.password.value = '';
		this.status.clear();
		this.lockForm.hidden = true;
		this.board.hidden = false;
	}

	private toggle(postOpen: boolean) {
		this.list.hidden = postOpen;
		this.post.hidden = !postOpen;
		this.back.hidden = !postOpen;
		window.scrollTo({ top: 0 });
	}
}

function card(p: PrivatePost) {
	const a = document.createElement('a');
	a.className = 'card';
	a.href = `#${encodeURIComponent(p.slug)}`;
	const meta = document.createElement('span');
	meta.className = 'card-meta';
	meta.textContent = p.pubDate;
	const h = document.createElement('h3');
	h.className = 'card-title';
	h.textContent = p.title;
	const d = document.createElement('p');
	d.className = 'card-desc';
	d.textContent = p.description;
	a.append(meta, h, d);
	return a;
}
