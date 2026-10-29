import { useEffect, useState } from 'react';
import { failure, info, NO_STATUS, type Status } from '@/shared/ui/status';
import { exportKey, importKey, openWithKey, unlock } from './cipher.js';
import type { Envelope, KeyStore, PrivatePayload, PrivatePost } from './types';

/**
 * 잠금 해제·잠금 상태. 복호화는 cipher, 키 보관은 주입받은 KeyStore에 맡긴다(DIP).
 * posts가 null이면 잠긴 상태다.
 */
export function usePrivateBoard(envelope: Envelope | null, keys: KeyStore) {
	const [posts, setPosts] = useState<PrivatePost[] | null>(null);
	const [status, setStatus] = useState<Status>(NO_STATUS);
	const [busy, setBusy] = useState(false);

	// 같은 탭에서 이미 열었으면 다시 묻지 않는다.
	useEffect(() => {
		const raw = keys.load();
		if (!envelope || !raw) return;
		let cancelled = false;
		(async () => {
			try {
				const payload = (await openWithKey(envelope, await importKey(raw))) as PrivatePayload;
				if (!cancelled) setPosts(payload.posts);
			} catch {
				keys.clear(); // 게시판이 다시 암호화되어 예전 키가 맞지 않는 경우
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [envelope, keys]);

	/** 성공하면 true. */
	async function open(password: string): Promise<boolean> {
		if (!envelope) return false;
		setBusy(true);
		setStatus(info('확인하는 중…'));
		try {
			const { payload, key } = await unlock(envelope, password);
			keys.save(await exportKey(key));
			setPosts((payload as PrivatePayload).posts);
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
		setPosts(null);
		setStatus(NO_STATUS);
	}

	return { posts, status, busy, open, lock };
}
