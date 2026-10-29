// 비공개 게시판 암호화 스크립트.
//
//   frontend/private/*.md  (git에 올리지 않음)
//     → 마크다운을 HTML로 변환 (front matter에 deck: '폴더'가 있으면 private/decks/폴더 발표도 함께 묶음)
//     → 비밀번호로 암호화 (형식은 src/features/private-board/lib/cipher.js 하나가 정한다)
//     → public/private/board.sealed.json          글 목록·본문 (작다. 잠금 화면이 바로 뜨게)
//       public/private/<slug>.<hash>.deck.sealed.json  발표 슬라이드 (크다. 그 글을 열 때만 받는다)
//     이 암호문 파일들만 커밋한다.
//
// 사용법:
//   npm run seal                          # 터미널에서 비밀번호를 직접 입력
//   PRIVATE_PASSWORD='...' npm run seal   # 환경 변수로 전달
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { marked } from 'marked';
import { createKey, sealWithKey } from '../src/features/private-board/lib/cipher.js';
import { BOARD_FILE, deckFileName } from '../src/features/private-board/lib/files.js';
import { bundleDeck } from './bundle-deck.mjs';

const SOURCE_DIR = new URL('../private/', import.meta.url);
const OUTPUT_DIR = new URL('../public/private/', import.meta.url);
const MIN_PASSWORD_LENGTH = 8;

/** front matter(--- ... ---)와 본문을 나눈다. */
export function parseFrontMatter(raw) {
	const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) return { meta: {}, body: raw };
	const meta = {};
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^(\w+):\s*['"]?(.*?)['"]?\s*$/);
		if (kv) meta[kv[1]] = kv[2];
	}
	return { meta, body: m[2] };
}

/** 파일 하나를 게시판 글 하나로 만든다. */
export function toPost(fileName, raw) {
	const { meta, body } = parseFrontMatter(raw);
	const slug = fileName.replace(/\.md$/, '');
	return {
		slug,
		title: meta.title || slug,
		description: meta.description || '',
		pubDate: meta.pubDate || '',
		html: marked.parse(body),
		...(meta.deck ? { deckDir: meta.deck } : {}),
	};
}

/** front matter에 deck: '폴더'가 있으면 private/decks/폴더 를 HTML 하나로 묶어 붙인다. */
export async function attachDeck(post, sourceDir = SOURCE_DIR) {
	if (!post.deckDir) return post;
	const { deckDir, ...rest } = post;
	return { ...rest, deck: await bundleDeck(new URL(`decks/${deckDir}/`, sourceDir)) };
}

/** 최신 글이 먼저, 날짜가 같으면 slug 순. */
export const comparePosts = (a, b) => b.pubDate.localeCompare(a.pubDate) || a.slug.localeCompare(b.slug);

/** 게시판 글로 쓸 파일인지. README 같은 안내 문서는 제외한다. */
export const isPostFile = (name) => name.endsWith('.md') && !/^readme\.md$/i.test(name);

async function readPosts() {
	const files = (await readdir(SOURCE_DIR).catch(() => [])).filter(isPostFile);
	const posts = await Promise.all(
		files.map(async (f) => attachDeck(toPost(f, await readFile(new URL(f, SOURCE_DIR), 'utf8')))),
	);
	return posts.sort(comparePosts);
}

async function askPassword() {
	if (process.env.PRIVATE_PASSWORD) return process.env.PRIVATE_PASSWORD;
	const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
	// 입력한 글자 대신 * 를 보여 준다.
	rl._writeToOutput = (s) => rl.output.write(s.includes('\n') ? s : '*');
	const password = await new Promise((resolve) => rl.question('비공개 게시판 비밀번호: ', resolve));
	rl.close();
	process.stdout.write('\n');
	return password;
}

/** 발표를 글과 따로 잠근다. 파일 이름에 내용 해시를 넣어 캐시된 옛 파일과 섞이지 않게 한다. */
export async function sealDeck(post, key) {
	const { deck, ...rest } = post;
	if (!deck) return { post: rest, file: null };
	const part = await sealWithKey(deck, key);
	const hash = createHash('sha256').update(part.data).digest('hex').slice(0, 8);
	const name = deckFileName(post.slug, hash);
	return { post: { ...rest, deckFile: name }, file: { name, body: part } };
}

async function main() {
	const posts = await readPosts();
	const password = await askPassword();
	if (!password || password.length < MIN_PASSWORD_LENGTH) {
		console.error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
		process.exit(1);
	}
	await mkdir(OUTPUT_DIR, { recursive: true });
	for (const old of (await readdir(OUTPUT_DIR)).filter((f) => f.endsWith('.sealed.json'))) {
		await rm(new URL(old, OUTPUT_DIR));
	}

	// 키를 한 번 만들어 게시판과 발표 파일을 같은 키로 잠근다. 비밀번호 하나로 전부 열린다.
	const { key, header } = await createKey(password);
	const sealed = await Promise.all(posts.map((p) => sealDeck(p, key)));
	for (const { file } of sealed) {
		if (file) await writeFile(new URL(file.name, OUTPUT_DIR), JSON.stringify(file.body) + '\n');
	}
	// 게시판 봉투에만 salt가 들어간다. 브라우저는 이걸로 키를 만들어 발표 파일도 연다.
	const board = await sealWithKey({ posts: sealed.map((s) => s.post) }, key);
	await writeFile(new URL(BOARD_FILE, OUTPUT_DIR), JSON.stringify({ ...header, ...board }) + '\n');
	const decks = sealed.filter((s) => s.file).length;
	console.log(`글 ${posts.length}개(발표 ${decks}개)를 암호화했습니다 -> public/private/`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
