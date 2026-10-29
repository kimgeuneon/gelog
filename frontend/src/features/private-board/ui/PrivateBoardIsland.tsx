import { useMemo } from 'react';
import { SessionKeyStore } from '../lib/key-store';
import { StaticBoardSource } from '../lib/source';
import PrivateBoard from './PrivateBoard';

/**
 * 조립 지점(composition root). 봉투를 어디서 받을지(정적 파일)와
 * 키를 어디에 둘지(탭 세션)는 여기서만 정하고, 아래에는 추상으로 넘긴다.
 */
export default function PrivateBoardIsland({ baseUrl }: { baseUrl: string }) {
	const source = useMemo(() => new StaticBoardSource(baseUrl), [baseUrl]);
	const keys = useMemo(() => new SessionKeyStore(), []);
	return <PrivateBoard source={source} keys={keys} />;
}
