// 발표 폴더(index.html + css + js + assets/)를 HTML 문자열 하나로 묶는다.
// 비공개 게시판 글에 넣어 함께 암호화하고, 브라우저에서는 sandbox iframe(srcdoc)으로 띄운다.
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const MIME = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
};

/** 인라인 <script> 안에서 </script>가 태그를 닫아 버리지 않게 한다. */
const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script');

async function inlineAssets(text, dirUrl) {
	const refs = [...new Set([...text.matchAll(/(["'])(assets\/[^"'\s]+)\1/g)].map((m) => m[2]))];
	for (const ref of refs) {
		const mime = MIME[extname(ref).toLowerCase()];
		if (!mime) continue;
		const data = await readFile(new URL(ref, dirUrl));
		text = text.replaceAll(ref, `data:${mime};base64,${data.toString('base64')}`);
	}
	return text;
}

/** @param {URL} dirUrl 발표 폴더 (끝에 / 포함) */
export async function bundleDeck(dirUrl) {
	const read = (name) => readFile(new URL(name, dirUrl), 'utf8');
	let html = await read('index.html');

	for (const [tag, href] of [...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)].map((m) => [m[0], m[1]])) {
		const css = await inlineAssets(await read(href), dirUrl);
		html = html.split(tag).join(`<style>\n${css}\n</style>`);
	}
	for (const [tag, src] of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => [m[0], m[1]])) {
		const js = await inlineAssets(await read(src), dirUrl);
		html = html.split(tag).join(`<script>\n${safeScript(js)}\n</script>`);
	}
	return html;
}
