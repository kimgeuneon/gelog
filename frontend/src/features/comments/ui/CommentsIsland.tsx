import { useMemo } from 'react';
import { HttpCommentsApi } from '../lib/api';
import CommentsPanel from './CommentsPanel';

/**
 * 조립 지점(composition root). Astro에서 넘길 수 있는 건 직렬화되는 값뿐이라
 * 주소만 받아 실제 HTTP 구현을 여기서 만들고, 아래 화면에는 추상(CommentsApi)으로 넘긴다.
 */
export default function CommentsIsland({ apiUrl, slug }: { apiUrl: string; slug: string }) {
	const api = useMemo(() => new HttpCommentsApi(apiUrl), [apiUrl]);
	return <CommentsPanel api={api} slug={slug} />;
}
