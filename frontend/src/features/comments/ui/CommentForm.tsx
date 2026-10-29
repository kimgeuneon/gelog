import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import type { CommentInput } from '../lib/types';

type Props = {
	busy: boolean;
	/** 성공하면 true. 성공했을 때만 본문을 비운다(닉네임·비밀번호는 남긴다). */
	onSubmit: (input: CommentInput) => Promise<boolean>;
	status: ReactNode;
};

const EMPTY: CommentInput = { nickname: '', password: '', content: '' };

/** 댓글 작성 폼. 입력값만 들고 있고, 보내는 일은 onSubmit에 맡긴다. */
export default function CommentForm({ busy, onSubmit, status }: Props) {
	const [form, setForm] = useState(EMPTY);
	const bind = (key: keyof CommentInput) => ({
		name: key,
		value: form[key],
		onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setForm((f) => ({ ...f, [key]: e.target.value })),
	});

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (await onSubmit(form)) setForm((f) => ({ ...f, content: '' }));
	}

	return (
		<form className="comment-form panel" onSubmit={submit}>
			<div className="row">
				<input className="field" placeholder="닉네임" maxLength={30} required autoComplete="nickname" {...bind('nickname')} />
				<input className="field" type="password" placeholder="비밀번호 (삭제할 때 필요)" minLength={4} maxLength={64}
					required autoComplete="new-password" {...bind('password')} />
			</div>
			<textarea className="field" placeholder="댓글을 입력하세요" maxLength={1000} rows={4} required {...bind('content')} />
			<div className="actions">
				{status}
				<button className="btn-primary" type="submit" disabled={busy}>
					등록
				</button>
			</div>
		</form>
	);
}
