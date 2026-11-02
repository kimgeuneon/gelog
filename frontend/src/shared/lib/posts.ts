import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export type PostWithNeighbors = { post: Post; prev: Post | null; next: Post | null };

/**
 * 최신 글이 먼저, 날짜가 같으면 id 순. 모든 페이지가 이 순서를 쓴다.
 * pubDate는 시각과 시간대까지 적는다. (예: '2026-11-03T02:35:00+09:00')
 * 날짜만 적으면 UTC 자정으로 읽혀서, 같은 날 시각을 적은 글보다 뒤늦게 올린 것으로 계산된다.
 */
export function comparePosts(a: Post, b: Post): number {
	return b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id);
}

export async function getSortedPosts(): Promise<Post[]> {
	return (await getCollection('blog')).sort(comparePosts);
}

/** 최신순 배열에서 이전 글은 더 오래된 글(다음 원소), 다음 글은 더 최신 글(앞 원소)이다. */
export function withNeighbors(posts: Post[]): PostWithNeighbors[] {
	return posts.map((post, i) => ({ post, prev: posts[i + 1] ?? null, next: posts[i - 1] ?? null }));
}
