import { useEffect, useMemo, useState } from 'react';
import { SessionKeyStore } from '../lib/key-store';
import type { Envelope } from '../lib/types';
import PrivateBoard from './PrivateBoard';

/**
 * 조립 지점(composition root). 봉투는 수 MB라 island props로 넘기지 않고,
 * 페이지에 심어 둔 <script type="application/json">에서 읽는다. 키 저장소 구현도 여기서 고른다.
 */
export default function PrivateBoardIsland({ sealedId }: { sealedId: string }) {
	const keys = useMemo(() => new SessionKeyStore(), []);
	const [envelope, setEnvelope] = useState<Envelope | null>(null);

	useEffect(() => {
		const text = document.getElementById(sealedId)?.textContent;
		if (text) setEnvelope(JSON.parse(text) as Envelope);
	}, [sealedId]);

	return <PrivateBoard envelope={envelope} keys={keys} />;
}
