import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * 모든 페이지가 같은 순서를 쓰도록 정렬 기준을 한 곳에 둔다.
 * 최신 글이 먼저 오고, 날짜가 같으면 id 순으로 고정한다.
 */
export async function getSortedPosts(): Promise<Post[]> {
	const posts = await getCollection('blog');
	return posts.sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id),
	);
}
