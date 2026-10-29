import { useEffect, useState } from 'react';
import { slugFromHash } from './route';

/** 주소의 #해시를 글 slug로 쓴다. 뒤로 가기·앞으로 가기도 따라간다. */
export function useHashRoute() {
	const [slug, setSlug] = useState('');

	useEffect(() => {
		const sync = () => setSlug(slugFromHash(location.hash));
		sync();
		window.addEventListener('hashchange', sync);
		window.addEventListener('popstate', sync);
		return () => {
			window.removeEventListener('hashchange', sync);
			window.removeEventListener('popstate', sync);
		};
	}, []);

	/** 목록으로. push면 뒤로 가기로 글에 돌아올 수 있고, replace면 기록을 남기지 않는다. */
	function toList(mode: 'push' | 'replace' = 'push') {
		history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', location.pathname + location.search);
		setSlug('');
	}

	return { slug, toList };
}
