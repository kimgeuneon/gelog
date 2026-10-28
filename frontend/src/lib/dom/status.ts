/** 폼 아래 상태 문구 하나를 다룬다. 여러 컴포넌트가 같이 쓴다. */
export class StatusLine {
	constructor(private readonly el: HTMLElement) {}

	info(message: string) {
		this.set(message, false);
	}

	error(message: string) {
		this.set(message, true);
	}

	clear() {
		this.set('', false);
	}

	private set(message: string, isError: boolean) {
		this.el.textContent = message;
		this.el.classList.toggle('error', isError);
	}
}

/** 필수 요소를 찾고, 없으면 바로 알 수 있게 실패한다. */
export function must<T extends Element>(root: ParentNode, selector: string): T {
	const el = root.querySelector<T>(selector);
	if (!el) throw new Error(`missing element: ${selector}`);
	return el;
}
