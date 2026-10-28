import { must, StatusLine } from '../dom/status';
import type { Comment } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 댓글 영역의 DOM만 다룬다. 통신은 모른다(SRP). 사용자 입력은 textContent로만 넣는다. */
export class CommentsView {
	readonly status: StatusLine;
	readonly form: HTMLFormElement;
	private readonly list: HTMLUListElement;
	private readonly empty: HTMLElement;
	private readonly count: HTMLElement;
	private readonly submit: HTMLButtonElement;

	constructor(root: HTMLElement) {
		this.list = must(root, '[data-list]');
		this.empty = must(root, '[data-empty]');
		this.count = must(root, '[data-count]');
		this.form = must(root, '[data-form]');
		this.submit = must(this.form, 'button[type="submit"]');
		this.status = new StatusLine(must(root, '[data-status]'));
	}

	render(comments: Comment[], onDelete: (id: number) => void) {
		this.list.replaceChildren(...comments.map((c) => this.item(c, onDelete)));
		this.empty.hidden = comments.length > 0;
		this.count.textContent = comments.length ? String(comments.length) : '';
	}

	hideEmpty() {
		this.empty.hidden = true;
	}

	readInput() {
		const data = new FormData(this.form);
		const get = (k: string) => String(data.get(k) ?? '');
		return { nickname: get('nickname'), content: get('content'), password: get('password') };
	}

	clearContent() {
		(this.form.elements.namedItem('content') as HTMLTextAreaElement).value = '';
	}

	setBusy(busy: boolean) {
		this.submit.disabled = busy;
	}

	private item(c: Comment, onDelete: (id: number) => void) {
		const li = document.createElement('li');
		const head = document.createElement('div');
		head.className = 'head';
		const name = document.createElement('strong');
		name.textContent = c.nickname;
		const date = document.createElement('time');
		date.dateTime = c.created_at;
		date.textContent = formatDate(c.created_at);
		const del = document.createElement('button');
		del.type = 'button';
		del.className = 'delete';
		del.textContent = '삭제';
		del.addEventListener('click', () => onDelete(c.id));
		head.append(name, date, del);
		const body = document.createElement('p');
		body.textContent = c.content;
		li.append(head, body);
		return li;
	}
}
