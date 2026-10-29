import { useEffect, useState } from 'react';

type PartState<T> = { kind: 'loading' } | { kind: 'ready'; value: T } | { kind: 'error'; message: string };

/** 글을 열 때만 받는 부속 파일(발표 등)의 로딩 상태. 여는 방법은 인자로 받는다. */
export function usePart<T>(file: string, openPart: (file: string) => Promise<T>) {
	const [state, setState] = useState<PartState<T>>({ kind: 'loading' });

	useEffect(() => {
		let cancelled = false;
		setState({ kind: 'loading' });
		openPart(file).then(
			(value) => !cancelled && setState({ kind: 'ready', value }),
			(err) => !cancelled && setState({ kind: 'error', message: err instanceof Error ? err.message : '불러오지 못했습니다.' }),
		);
		return () => {
			cancelled = true;
		};
	}, [file, openPart]);

	return state;
}
