import type { KeyStore } from './types';

/** 같은 탭 안에서만 유지된다. 탭을 닫으면 다시 비밀번호를 물어본다. */
export class SessionKeyStore implements KeyStore {
	constructor(private readonly name = 'gelog-private-key') {}

	load() {
		return sessionStorage.getItem(this.name);
	}

	save(rawKey: string) {
		sessionStorage.setItem(this.name, rawKey);
	}

	clear() {
		sessionStorage.removeItem(this.name);
	}
}
