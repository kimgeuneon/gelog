import { type FormEvent, useMemo, useState } from 'react';
import { HttpCommentsApi } from '../lib/comments/api';
import { formatDate } from '../lib/comments/format';
import { useComments } from '../lib/comments/useComments';

type Props = {
	apiUrl: string;
	slug: string;
	/** 삭제 비밀번호를 묻는 방법. 기본은 브라우저 prompt. */
	askPassword?: () => string | null;
};

const defaultAsk = () => prompt('댓글을 쓸 때 입력한 비밀번호를 입력하세요.');

/** 댓글 목록 + 작성 폼. 사용자 입력은 React가 텍스트로만 넣으므로 HTML로 해석되지 않는다. */
export default function CommentsIsland({ apiUrl, slug, askPassword = defaultAsk }: Props) {
	const api = useMemo(() => new HttpCommentsApi(apiUrl), [apiUrl]);
	const { comments, status, busy, create, remove } = useComments(slug, api);
	const [form, setForm] = useState({ nickname: '', password: '', content: '' });

	const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
		setForm((f) => ({ ...f, [key]: e.target.value }));

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		if (await create(form)) setForm((f) => ({ ...f, content: '' }));
	}

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
			{comments?.length === 0 && <p className="empty">아직 댓글이 없습니다. 첫 댓글을 남겨 주세요.</p>}

			<form className="comment-form panel" onSubmit={onSubmit}>
				<div className="row">
					<input className="field" name="nickname" placeholder="닉네임" maxLength={30} required
						autoComplete="nickname" value={form.nickname} onChange={set('nickname')} />
					<input className="field" name="password" type="password" placeholder="비밀번호 (삭제할 때 필요)"
						minLength={4} maxLength={64} required autoComplete="new-password"
						value={form.password} onChange={set('password')} />
				</div>
				<textarea className="field" name="content" placeholder="댓글을 입력하세요" maxLength={1000} rows={4}
					required value={form.content} onChange={set('content')} />
				<div className="actions">
					<p className={status.error ? 'status error' : 'status'} role="status">
						{status.message}
					</p>
					<button className="btn-primary" type="submit" disabled={busy}>
						등록
					</button>
				</div>
			</form>
		</>
	);
}
