export type Comment = { id: number; nickname: string; content: string; created_at: string };

export type CommentInput = { nickname: string; content: string; password: string };

/** 컨트롤러가 의존하는 추상. 실제 HTTP 구현이나 테스트용 가짜를 끼울 수 있다(DIP). */
export interface CommentsApi {
	list(slug: string): Promise<Comment[]>;
	create(slug: string, input: CommentInput): Promise<Comment>;
	remove(id: number, password: string): Promise<void>;
}
