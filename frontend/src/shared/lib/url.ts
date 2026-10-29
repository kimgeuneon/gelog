/** 사이트 내부 경로에 base를 붙인다. base 처리는 이 함수 하나만 안다. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string): string {
	return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function stripBase(pathname: string): string {
	return pathname.replace(BASE, '') || '/';
}

export const postUrl = (id: string) => withBase(`/blog/${id}/`);
