import { type FormEvent, useRef } from 'react';
import type { Status } from '@/shared/ui/status';
import StatusLine from '@/shared/ui/StatusLine';

type Props = {
	status: Status;
	busy: boolean;
	/** 성공하면 true. 틀리면 다시 입력하기 쉽게 입력값을 선택해 둔다. */
	onSubmit: (password: string) => Promise<boolean>;
};

export default function LockForm({ status, busy, onSubmit }: Props) {
	const input = useRef<HTMLInputElement>(null);

	async function submit(e: FormEvent) {
		e.preventDefault();
		const ok = await onSubmit(input.current?.value ?? '');
		if (!ok) input.current?.select();
	}

	return (
		<form className="lock panel" onSubmit={submit}>
			<label htmlFor="private-pw">비밀번호</label>
			<div className="lock-row">
				<input ref={input} className="field" id="private-pw" type="password" autoComplete="current-password" required />
				<button className="btn-primary" type="submit" disabled={busy}>
					열기
				</button>
			</div>
			<StatusLine status={status} />
		</form>
	);
}
