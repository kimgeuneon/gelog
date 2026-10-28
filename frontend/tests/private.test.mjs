import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportKey, importKey, openWithKey, seal, unlock } from '../src/lib/private/cipher.js';
import { comparePosts, parseFrontMatter, toPost } from '../scripts/seal-private.mjs';

const ITER = 1_000; // 테스트는 빠르게

test('seal → unlock 하면 원래 값이 나온다', async () => {
	const env = await seal({ posts: [{ slug: 'a' }] }, 'correct-horse', ITER);
	const { payload } = await unlock(env, 'correct-horse');
	assert.deepEqual(payload, { posts: [{ slug: 'a' }] });
});

test('봉투에는 평문이 남지 않는다', async () => {
	const env = await seal({ secret: 'SECRET-MARKER' }, 'correct-horse', ITER);
	assert.ok(!JSON.stringify(env).includes('SECRET-MARKER'));
});

test('비밀번호가 틀리면 열리지 않는다', async () => {
	const env = await seal({ x: 1 }, 'correct-horse', ITER);
	await assert.rejects(unlock(env, 'wrong-password'));
});

test('내보낸 키로 다시 열 수 있다 (세션 복원)', async () => {
	const env = await seal({ x: 1 }, 'correct-horse', ITER);
	const { key } = await unlock(env, 'correct-horse');
	assert.deepEqual(await openWithKey(env, await importKey(await exportKey(key))), { x: 1 });
});

test('같은 내용도 매번 다른 salt/iv로 암호화된다', async () => {
	const [a, b] = await Promise.all([seal({ x: 1 }, 'pw-12345678', ITER), seal({ x: 1 }, 'pw-12345678', ITER)]);
	assert.notEqual(a.salt, b.salt);
	assert.notEqual(a.data, b.data);
});

test('front matter와 마크다운을 글로 바꾼다', () => {
	const post = toPost('deck.md', "---\ntitle: '발표'\npubDate: '2026-10-28'\n---\n## 제목\n**굵게**");
	assert.equal(post.slug, 'deck');
	assert.equal(post.title, '발표');
	assert.match(post.html, /<h2>제목<\/h2>/);
	assert.match(post.html, /<strong>굵게<\/strong>/);
	assert.deepEqual(parseFrontMatter('본문만').meta, {});
});

test('최신 글이 먼저 온다', () => {
	const posts = [{ slug: 'b', pubDate: '2026-01-01' }, { slug: 'a', pubDate: '2026-02-01' }, { slug: 'c', pubDate: '2026-01-01' }];
	assert.deepEqual(posts.sort(comparePosts).map((p) => p.slug), ['a', 'b', 'c']);
});
