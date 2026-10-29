import { useCallback, useEffect, useState } from 'react';
import { errorMessage, failure, info, NO_STATUS, type Status } from '@/shared/ui/status';
import type { Comment, CommentInput, CommentsApi } from './types';

/**
 * 댓글 상태와 동작(불러오기·등록·삭제). 통신은 주입받은 CommentsApi에 맡긴다(DIP).
 * 화면은 이 훅이 돌려주는 값만 그리면 된다.
 */
export function useComments(slug: string, api: CommentsApi) {
	const [comments, setComments] = useState<Comment[] | null>(null); // null = 아직 못 불러옴
	const [status, setStatus] = useState<Status>(NO_STATUS);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			setComments(await api.list(slug));
		} catch {
			setStatus(failure('댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
		}
	}, [api, slug]);

	useEffect(() => {
		void load();
	}, [load]);

	/** 성공하면 true (폼에서 본문을 비우는 데 쓴다). */
	async function create(input: CommentInput): Promise<boolean> {
		setBusy(true);
		setStatus(info('등록하는 중…'));
		try {
			await api.create(slug, input);
			setStatus(info('댓글을 등록했습니다.'));
			await load();
			return true;
		} catch (err) {
			setStatus(failure(errorMessage(err, '등록에 실패했습니다.')));
			return false;
		} finally {
			setBusy(false);
		}
	}

	async function remove(id: number, password: string) {
		try {
			await api.remove(id, password);
			setStatus(info('댓글을 삭제했습니다.'));
			await load();
		} catch (err) {
			setStatus(failure(errorMessage(err, '삭제에 실패했습니다.')));
		}
	}

	return { comments, status, busy, create, remove };
}
