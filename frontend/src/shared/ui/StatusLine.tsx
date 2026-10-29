import type { Status } from './status';

/** 폼 아래 상태 문구 한 줄. 댓글과 비밀 게시판이 같이 쓴다. */
export default function StatusLine({ status }: { status: Status }) {
	return (
		<p className={status.error ? 'status error' : 'status'} role="status">
			{status.message}
		</p>
	);
}
