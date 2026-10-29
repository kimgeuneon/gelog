import type { CommentsApi } from '../lib/types';
import { useComments } from '../lib/useComments';
import StatusLine from '@/shared/ui/StatusLine';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

type Props = {
	api: CommentsApi;
	slug: string;
	/** 삭제 비밀번호를 묻는 방법. 기본은 브라우저 prompt, 테스트에서는 바꿔 끼운다. */
	askPassword?: () => string | null;
};

const defaultAsk = () => prompt('댓글을 쓸 때 입력한 비밀번호를 입력하세요.');

/** 댓글 영역: 상태는 훅에, 그리기는 목록·폼 컴포넌트에 맡긴다. */
export default function CommentsPanel({ api, slug, askPassword = defaultAsk }: Props) {
	const { comments, status, busy, create, remove } = useComments(slug, api);

	function onDelete(id: number) {
		const password = askPassword();
		if (password) void remove(id, password);
	}

	return (
		<>
			<div className="section-head">
				<h2>
					댓글 <span className="count">{comments?.length || ''}</span>
				</h2>
			</div>
			<CommentList comments={comments} onDelete={onDelete} />
			<CommentForm busy={busy} onSubmit={create} status={<StatusLine status={status} />} />
		</>
	);
}
