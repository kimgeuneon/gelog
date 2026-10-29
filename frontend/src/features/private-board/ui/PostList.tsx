import { postHref } from '../lib/route';
import type { PrivatePost } from '../lib/types';

export default function PostList({ posts }: { posts: readonly PrivatePost[] }) {
	if (!posts.length) return <p className="empty">아직 글이 없습니다.</p>;
	return (
		<div className="card-grid">
			{posts.map((p) => (
				<a key={p.slug} className="card" href={postHref(p.slug)}>
					<span className="card-meta">{p.pubDate}</span>
					<h3 className="card-title">{p.title}</h3>
					<p className="card-desc">{p.description}</p>
				</a>
			))}
		</div>
	);
}
