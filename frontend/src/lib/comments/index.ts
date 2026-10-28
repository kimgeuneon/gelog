import { HttpCommentsApi } from './api';
import { CommentsController } from './controller';
import { CommentsView } from './view';

/** data-comments 영역마다 구현을 조립해서 띄운다. */
export function mountComments(root: HTMLElement) {
	const { api, slug } = root.dataset;
	if (!api || !slug) return;
	void new CommentsController(slug, new HttpCommentsApi(api), new CommentsView(root)).start();
}
