import { useEffect } from 'react';
import { findPost } from '../lib/route';
import type { BoardSource, KeyStore } from '../lib/types';
import { useHashRoute } from '../lib/useHashRoute';
import { usePrivateBoard } from '../lib/usePrivateBoard';
import LockForm from './LockForm';
import PostList from './PostList';
import PostView from './PostView';

type Props = { source: BoardSource; keys: KeyStore };

/** 잠금 화면 ↔ 목록 ↔ 글. 상태는 두 훅에, 그리기는 하위 컴포넌트에 맡긴다. */
export default function PrivateBoard({ source, keys }: Props) {
	const { envelope, posts, status, busy, open, lock, openPart } = usePrivateBoard(source, keys);
	const { slug, toList } = useHashRoute();
	const post = posts ? findPost(posts, slug) : null;

	useEffect(() => {
		if (posts) window.scrollTo({ top: 0 });
	}, [posts, post]);

	if (envelope === null) return <p className="empty">아직 게시판에 글이 없습니다.</p>;
	if (!posts) return <LockForm status={status} busy={busy || !envelope} onSubmit={open} />;

	function relock() {
		lock();
		toList('replace');
	}

	return (
		<div>
			<div className="section-head">
				<h2>{post ? post.title : `글 목록 (${posts.length})`}</h2>
				<button type="button" className="btn-link" onClick={relock}>
					잠그기
				</button>
			</div>
			{post ? <PostView post={post} openPart={openPart} onBack={() => toList()} /> : <PostList posts={posts} />}
		</div>
	);
}
