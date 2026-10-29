import { useCallback, useEffect, useState } from 'react';
import { failure, info, NO_STATUS, type Status } from '@/shared/ui/status';
import { exportKey, importKey, openWithKey, unlock } from './cipher.js';
import type { BoardSource, Envelope, KeyStore, PrivatePayload, PrivatePost } from './types';

type Session = { key: CryptoKey; posts: PrivatePost[] };

/**
 * 게시판 봉투를 받아 두고, 잠금 해제·잠금·부속 파일 열기를 담당한다.
 * 복호화는 cipher, 파일은 BoardSource, 키 보관은 KeyStore에 맡긴다(DIP).
 *
 * - envelope: undefined = 받는 중, null = 아직 글 없음(파일 없음)
 * - session: null = 잠김
 */
export function usePrivateBoard(source: BoardSource, keys: KeyStore) {
	const [envelope, setEnvelope] = useState<Envelope | null | undefined>(undefined);
	const [session, setSession] = useState<Session | null>(null);
	const [status, setStatus] = useState<Status>(NO_STATUS);
	const [busy, setBusy] = useState(false);

	// 봉투를 받고, 같은 탭에서 이미 열었으면 저장된 키로 바로 연다.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const env = await source.loadBoard();
				if (cancelled) return;
				setEnvelope(env);
				const raw = env && keys.load();
				if (!raw) return;
				try {
					const key = await importKey(raw);
					const payload = (await openWithKey(env, key)) as PrivatePayload;
					if (!cancelled) setSession({ key, posts: payload.posts });
				} catch {
					keys.clear(); // 게시판이 다시 암호화되어 예전 키가 맞지 않는 경우
				}
			} catch (err) {
				if (!cancelled) setStatus(failure(err instanceof Error ? err.message : '게시판을 불러오지 못했습니다.'));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [source, keys]);

	/** 성공하면 true. */
	async function open(password: string): Promise<boolean> {
		if (!envelope) return false;
		setBusy(true);
		setStatus(info('확인하는 중…'));
		try {
			const { payload, key } = await unlock(envelope, password);
			keys.save(await exportKey(key));
			setSession({ key, posts: (payload as PrivatePayload).posts });
			setStatus(NO_STATUS);
			return true;
		} catch {
			setStatus(failure('비밀번호가 맞지 않습니다.'));
			return false;
		} finally {
			setBusy(false);
		}
	}

	function lock() {
		keys.clear();
		setSession(null);
		setStatus(NO_STATUS);
	}

	/** 글에 딸린 부속 파일(발표 등)을 받아서 연다. 글마다 받으므로 큰 파일이 첫 화면을 늦추지 않는다. */
	const openPart = useCallback(
		async <T,>(file: string): Promise<T> => {
			if (!session) throw new Error('잠겨 있습니다.');
			return openWithKey(await source.loadPart(file), session.key) as Promise<T>;
		},
		[source, session],
	);

	return { envelope, posts: session?.posts ?? null, status, busy, open, lock, openPart };
}
