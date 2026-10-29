import type { PrivatePost } from './types';

/** '#my-post' → 'my-post'. 해시가 없으면 빈 문자열(= 목록). */
export function slugFromHash(hash: string): string {
	try {
		return decodeURIComponent(hash.replace(/^#/, ''));
	} catch {
		return ''; // 잘못된 % 인코딩
	}
}

/** 목록에 있는 글이면 그 글, 아니면 null(목록을 보여 준다). */
export function findPost(posts: readonly PrivatePost[], slug: string): PrivatePost | null {
	return (slug && posts.find((p) => p.slug === slug)) || null;
}

export const postHref = (slug: string) => `#${encodeURIComponent(slug)}`;
