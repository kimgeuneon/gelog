import type { Comment, CommentInput, CommentsApi } from './types';

export class ApiError extends Error {}

/** 백엔드 응답을 사람이 읽을 메시지로 바꾼다. */
async function toApiError(res: Response): Promise<ApiError> {
	try {
		const body = await res.json();
		if (typeof body.detail === 'string') return new ApiError(body.detail);
		if (Array.isArray(body.detail))
			return new ApiError('입력값을 확인해 주세요. (닉네임 30자, 댓글 1000자, 비밀번호 4자 이상)');
	} catch {
		/* 본문이 JSON이 아닌 경우 */
	}
	return new ApiError(`요청에 실패했습니다. (${res.status})`);
}

/** fetch 기반 CommentsApi 구현. 통신과 오류 변환만 맡는다(SRP). */
export class HttpCommentsApi implements CommentsApi {
	constructor(private readonly baseUrl: string) {}

	list(slug: string) {
		return this.request<Comment[]>(`/api/posts/${slug}/comments`);
	}

	create(slug: string, input: CommentInput) {
		return this.request<Comment>(`/api/posts/${slug}/comments`, { method: 'POST', body: input });
	}

	async remove(id: number, password: string) {
		await this.request<void>(`/api/comments/${id}`, { method: 'DELETE', body: { password } });
	}

	private async request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
		const res = await fetch(`${this.baseUrl}${path}`, {
			method: opts.method ?? 'GET',
			headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
			body: opts.body ? JSON.stringify(opts.body) : undefined,
		});
		if (!res.ok) throw await toApiError(res);
		return (res.status === 204 ? undefined : await res.json()) as T;
	}
}
