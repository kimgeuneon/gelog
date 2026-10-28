import type { CommentsApi } from './types';
import type { CommentsView } from './view';

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** 사용자 동작과 API를 잇는다. API와 View는 생성자로 받는다(DIP). */
export class CommentsController {
	constructor(
		private readonly slug: string,
		private readonly api: CommentsApi,
		private readonly view: CommentsView,
		private readonly askPassword: () => string | null = () =>
			prompt('댓글을 쓸 때 입력한 비밀번호를 입력하세요.'),
	) {}

	start() {
		this.view.form.addEventListener('submit', (e) => {
			e.preventDefault();
			void this.submit();
		});
		return this.load();
	}

	async load() {
		try {
			this.view.render(await this.api.list(this.slug), (id) => void this.remove(id));
		} catch {
			this.view.hideEmpty();
			this.view.status.error('댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
		}
	}

	private async submit() {
		this.view.setBusy(true);
		this.view.status.info('등록하는 중…');
		try {
			await this.api.create(this.slug, this.view.readInput());
			this.view.clearContent();
			this.view.status.info('댓글을 등록했습니다.');
			await this.load();
		} catch (err) {
			this.view.status.error(message(err, '등록에 실패했습니다.'));
		} finally {
			this.view.setBusy(false);
		}
	}

	private async remove(id: number) {
		const password = this.askPassword();
		if (!password) return;
		try {
			await this.api.remove(id, password);
			this.view.status.info('댓글을 삭제했습니다.');
			await this.load();
		} catch (err) {
			this.view.status.error(message(err, '삭제에 실패했습니다.'));
		}
	}
}
