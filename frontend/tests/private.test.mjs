import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createKey, exportKey, importKey, openWithKey, seal, sealWithKey, unlock } from '../src/features/private-board/lib/cipher.js';
import { comparePosts, isPostFile, parseFrontMatter, sealDeck, toPost } from '../scripts/seal-private.mjs';

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

test('README는 게시판 글로 쓰지 않는다', () => {
	assert.ok(isPostFile('261110-deepbot-lecture.md'));
	assert.ok(!isPostFile('README.md'));
	assert.ok(!isPostFile('notes.txt'));
});

test('본문이 비어 있어도 글이 된다', () => {
	const post = toPost('empty.md', "---\ntitle: '빈 글'\n---\n");
	assert.equal(post.title, '빈 글');
	assert.equal(post.html, '');
});

test('발표 폴더를 외부 파일 참조 없는 HTML 하나로 묶는다', async () => {
	const { mkdtemp, writeFile, mkdir } = await import('node:fs/promises');
	const { tmpdir } = await import('node:os');
	const { pathToFileURL } = await import('node:url');
	const { bundleDeck } = await import('../scripts/bundle-deck.mjs');
	const dir = await mkdtemp(`${tmpdir()}/deck-`);
	await mkdir(`${dir}/assets`);
	await writeFile(`${dir}/assets/a.png`, Buffer.from([137, 80, 78, 71]));
	await writeFile(`${dir}/style.css`, 'body{color:red}');
	await writeFile(`${dir}/content.js`, "window.X={src:'assets/a.png', s:'</script>'};");
	await writeFile(`${dir}/app.js`, 'console.log(1)');
	await writeFile(
		`${dir}/index.html`,
		'<link rel="stylesheet" href="style.css" /><script src="content.js"></script><script src="app.js"></script>',
	);
	const html = await bundleDeck(pathToFileURL(`${dir}/`));
	assert.match(html, /<style>\nbody\{color:red\}/);
	assert.match(html, /data:image\/png;base64,/);
	assert.ok(!/src="|href="|'assets\//.test(html), '외부 파일 참조가 남으면 안 된다');
	assert.ok(html.includes('<\\/script>'), '인라인 스크립트 안의 </script>는 이스케이프');
	assert.equal(html.match(/<\/script>/g).length, 2);
});

test('deck이 있는 글은 묶은 HTML을 deck 필드로 갖는다', async () => {
	const { attachDeck } = await import('../scripts/seal-private.mjs');
	const plain = toPost('a.md', "---\ntitle: 'A'\n---\n본문");
	assert.equal((await attachDeck(plain)).deck, undefined);
	assert.equal(toPost('b.md', "---\ndeck: 'x'\n---\n").deckDir, 'x');
});

test('수 MB짜리 내용도 암호화·복호화된다 (영상이 든 발표)', async () => {
	const big = 'x'.repeat(5 * 1024 * 1024);
	const env = await seal({ big }, 'correct-horse', ITER);
	const { payload } = await unlock(env, 'correct-horse');
	assert.equal(payload.big.length, big.length);
});

test('게시판 봉투의 비밀번호로 만든 키가 부속 파일도 연다', async () => {
	const { key, header } = await createKey('correct-horse', ITER);
	const board = { ...header, ...(await sealWithKey({ posts: [] }, key)) };
	const part = await sealWithKey('<html>deck</html>', key);
	const { key: opened } = await unlock(board, 'correct-horse');
	assert.equal(await openWithKey(part, opened), '<html>deck</html>');
	assert.ok(!('salt' in part), '부속 파일에는 salt가 없다');
});

test('발표는 글에서 떼어 따로 잠그고, 글에는 파일 이름만 남는다', async () => {
	const { key, header } = await createKey('correct-horse', ITER);
	const { post, file } = await sealDeck({ slug: 'talk', title: 'T', html: '<p>x</p>', deck: '<html>BIG</html>' }, key);
	// 브라우저가 하듯 게시판 봉투를 비밀번호로 열어 얻은 키로 발표 파일을 연다.
	const board = { ...header, ...(await sealWithKey({ posts: [post] }, key)) };
	const { key: readKey } = await unlock(board, 'correct-horse');
	assert.equal(post.deck, undefined);
	assert.match(post.deckFile, /^talk\.[0-9a-f]{8}\.deck\.sealed\.json$/);
	assert.equal(file.name, post.deckFile);
	assert.ok(!JSON.stringify(file.body).includes('BIG'));
	assert.equal(await openWithKey(file.body, readKey), '<html>BIG</html>');
	assert.deepEqual(await sealDeck({ slug: 'plain', html: '' }, key), { post: { slug: 'plain', html: '' }, file: null });
});
