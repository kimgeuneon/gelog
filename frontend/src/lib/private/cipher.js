// 비공개 게시판 암호화 형식. 브라우저(복호화)와 seal 스크립트(암호화)가 이 파일 하나를 같이 쓴다.
// 형식이나 알고리즘을 바꾸면 양쪽이 함께 바뀐다(단일 진실 공급원).
//
// 봉투(envelope) 형식 v1:
//   { v: 1, kdf: 'PBKDF2-SHA256', iterations, salt, iv, data }  (salt/iv/data는 base64)
//   key = PBKDF2-SHA256(password, salt, iterations) → AES-256-GCM

export const FORMAT_VERSION = 1;
export const DEFAULT_ITERATIONS = 600_000;

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** @param {Uint8Array} bytes */
export const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
/** @param {string} text */
export const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/**
 * @param {string} password
 * @param {Uint8Array} salt
 * @param {number} iterations
 * @param {KeyUsage[]} usages
 */
export async function deriveKey(password, salt, iterations, usages) {
	const base = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
	return subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		base,
		{ name: 'AES-GCM', length: 256 },
		true,
		usages,
	);
}

/**
 * 값을 JSON으로 직렬화해 암호화한다.
 * @param {unknown} payload
 * @param {string} password
 */
export async function seal(payload, password, iterations = DEFAULT_ITERATIONS) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(password, salt, iterations, ['encrypt']);
	const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload))));
	return { v: FORMAT_VERSION, kdf: 'PBKDF2-SHA256', iterations, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(data) };
}

/**
 * 이미 만든 키로 봉투를 연다. 키가 틀리면 예외가 난다(GCM 인증 실패).
 * @param {{ iv: string, data: string }} envelope
 * @param {CryptoKey} key
 */
export async function openWithKey(envelope, key) {
	const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data));
	return JSON.parse(decoder.decode(plain));
}

/**
 * 비밀번호로 봉투를 연다. 다음에 다시 쓸 수 있게 키도 돌려준다.
 * @param {{ iterations: number, salt: string, iv: string, data: string }} envelope
 * @param {string} password
 */
export async function unlock(envelope, password) {
	const key = await deriveKey(password, fromBase64(envelope.salt), envelope.iterations, ['decrypt']);
	return { payload: await openWithKey(envelope, key), key };
}

/** @param {CryptoKey} key */
export async function exportKey(key) {
	return toBase64(new Uint8Array(await subtle.exportKey('raw', key)));
}

/** @param {string} raw */
export function importKey(raw) {
	return subtle.importKey('raw', fromBase64(raw), 'AES-GCM', false, ['decrypt']);
}
