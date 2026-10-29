import { useCallback, useEffect, useState } from 'react';
import type { Comment, CommentInput, CommentsApi } from './types';

export type Status = { message: string; error: boolean };

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/**
 * 댓글 상태와 동작(불러오기·등록·삭제). 통신은 주입받은 CommentsApi에 맡긴다(DIP).
 * 화면은 이 훅이 돌려주는 값만 그리면 된다.
 */
export function useComments(slug: string, api: CommentsApi) {
	const [comments, setComments] = useState<Comment[] | null>(null); // null = 아직 못 불러옴
	const [status, setStatus] = useState<Status>({ message: '', error: false });
	const [busy, setBusy] = useState(false);

	const info = (m: string) => setStatus({ message: m, error: false });
	const fail = (m: string) => setStatus({ message: m, error: true });

	const load = useCallback(async () => {
		try {
			setComments(await api.list(slug));
		} catch {
			fail('댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
		}
	}, [api, slug]);

	useEffect(() => {
		void load();
	}, [load]);

	/** 성공하면 true (폼에서 본문을 비우는 데 쓴다). */
	async function create(input: CommentInput): Promise<boolean> {
		setBusy(true);
		info('등록하는 중…');
		try {
			await api.create(slug, input);
			info('댓글을 등록했습니다.');
			await load();
			return true;
		} catch (err) {
			fail(message(err, '등록에 실패했습니다.'));
			return false;
		} finally {
			setBusy(false);
		}
	}

	async function remove(id: number, password: string) {
		try {
			await api.remove(id, password);
			info('댓글을 삭제했습니다.');
			await load();
		} catch (err) {
			fail(message(err, '삭제에 실패했습니다.'));
		}
	}

	return { comments, status, busy, create, remove };
}
