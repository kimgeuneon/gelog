import { formatDate } from '../lib/format';
import type { Comment } from '../lib/types';

type Props = {
	/** null이면 아직 불러오기 전(또는 실패)이라 빈 안내도 띄우지 않는다. */
	comments: Comment[] | null;
	onDelete: (id: number) => void;
};

/** 댓글 목록. 사용자 입력은 React가 텍스트로만 넣으므로 HTML로 해석되지 않는다. */
export default function CommentList({ comments, onDelete }: Props) {
	if (comments?.length === 0) return <p className="empty">아직 댓글이 없습니다. 첫 댓글을 남겨 주세요.</p>;
	return (
		<ul className="comment-list">
			{comments?.map((c) => (
				<li key={c.id}>
					<div className="head">
						<strong>{c.nickname}</strong>
						<time dateTime={c.created_at}>{formatDate(c.created_at)}</time>
						<button type="button" className="delete" onClick={() => onDelete(c.id)}>
							삭제
						</button>
					</div>
					<p>{c.content}</p>
				</li>
			))}
		</ul>
	);
}
