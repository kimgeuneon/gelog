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
		if (post.deck) this.post.prepend(deckPlayer(post.deck, post.title));
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

/**
 * 발표 슬라이드를 sandbox iframe으로 띄운다.
 * allow-same-origin을 주지 않아서 iframe 안의 코드는 이 페이지(열쇠가 든 sessionStorage 등)에 접근할 수 없다.
 */
function deckPlayer(html: string, title: string) {
	const wrap = document.createElement('div');
	wrap.className = 'deck-player';

	const frame = document.createElement('iframe');
	frame.className = 'deck-frame';
	frame.title = `${title} 발표 슬라이드`;
	frame.setAttribute('sandbox', 'allow-scripts');
	frame.setAttribute('allow', 'fullscreen');
	frame.allowFullscreen = true;
	frame.srcdoc = html;

	const bar = document.createElement('div');
	bar.className = 'deck-bar';
	const hint = document.createElement('span');
	hint.textContent = '슬라이드를 한 번 누른 뒤 → / Space 로 넘기기';
	const full = document.createElement('button');
	full.type = 'button';
	full.className = 'btn-primary';
	full.textContent = '전체화면으로 발표';
	full.addEventListener('click', () => {
		frame.requestFullscreen?.().catch(() => {});
		frame.focus();
	});
	bar.append(hint, full);

	wrap.append(frame, bar);
	return wrap;
}
