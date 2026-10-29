import type { PrivatePost } from '../lib/types';
import DeckPlayer from './DeckPlayer';

type Props = { post: PrivatePost; onBack: () => void };

export default function PostView({ post, onBack }: Props) {
	return (
		<>
			<article className="prose">
				{post.deck && <DeckPlayer html={post.deck} title={post.title} />}
				{/* 내가 쓴 글을 빌드 때 HTML로 바꾼 것이라 그대로 넣는다. */}
				<div dangerouslySetInnerHTML={{ __html: post.html }} />
			</article>
			<p className="back">
				<a
					href="#"
					onClick={(e) => {
						e.preventDefault();
						onBack();
					}}
				>
					← 목록으로
				</a>
			</p>
		</>
	);
}
