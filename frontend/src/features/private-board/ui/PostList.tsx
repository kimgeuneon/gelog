import { postHref } from '../lib/route';
import type { PrivatePost } from '../lib/types';

export default function PostList({ posts }: { posts: readonly PrivatePost[] }) {
	if (!posts.length) return <p className="empty">아직 글이 없습니다.</p>;
	return (
		<ol className="entries">
			{posts.map((p) => (
				<li key={p.slug}>
					<a href={postHref(p.slug)}>
						<span className="entry-title">{p.title}</span>
						<span className="entry-desc">{p.description}</span>
					</a>
				</li>
			))}
		</ol>
	);
}
