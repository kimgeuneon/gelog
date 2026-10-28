// 비공개 게시판 암호화 스크립트.
//
//   frontend/private/*.md  (git에 올리지 않음)
//     → 마크다운을 HTML로 변환
//     → 비밀번호로 암호화 (형식은 src/lib/private/cipher.js 하나가 정한다)
//     → src/data/private.sealed.json  (이 파일만 커밋)
//
// 사용법:
//   npm run seal                          # 터미널에서 비밀번호를 직접 입력
//   PRIVATE_PASSWORD='...' npm run seal   # 환경 변수로 전달
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { marked } from 'marked';
import { seal } from '../src/lib/private/cipher.js';

const SOURCE_DIR = new URL('../private/', import.meta.url);
const OUTPUT_FILE = new URL('../src/data/private.sealed.json', import.meta.url);
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
	};
}

/** 최신 글이 먼저, 날짜가 같으면 slug 순. */
export const comparePosts = (a, b) => b.pubDate.localeCompare(a.pubDate) || a.slug.localeCompare(b.slug);

async function readPosts() {
	const files = (await readdir(SOURCE_DIR).catch(() => [])).filter((f) => f.endsWith('.md'));
	const posts = await Promise.all(files.map(async (f) => toPost(f, await readFile(new URL(f, SOURCE_DIR), 'utf8'))));
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

async function main() {
	const posts = await readPosts();
	const password = await askPassword();
	if (!password || password.length < MIN_PASSWORD_LENGTH) {
		console.error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
		process.exit(1);
	}
	await writeFile(OUTPUT_FILE, JSON.stringify(await seal({ posts }, password)) + '\n');
	console.log(`글 ${posts.length}개를 암호화했습니다 -> src/data/private.sealed.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
