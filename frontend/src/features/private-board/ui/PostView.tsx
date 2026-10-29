import type { PrivatePost } from '../lib/types';
import DeckSection from './DeckSection';

type Props = {
	post: PrivatePost;
	openPart: <T>(file: string) => Promise<T>;
	onBack: () => void;
};

export default function PostView({ post, openPart, onBack }: Props) {
	return (
		<>
			<article className="prose">
				{post.deckFile && <DeckSection file={post.deckFile} title={post.title} openPart={openPart} />}
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
