import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate } from '../src/features/comments/lib/format.ts';
import { findPost, postHref, slugFromHash } from '../src/features/private-board/lib/route.ts';
import { errorMessage, failure, info } from '../src/shared/ui/status.ts';

const posts = [
	{ slug: 'a', title: 'A', description: '', pubDate: '', html: '' },
	{ slug: '한글 글', title: 'K', description: '', pubDate: '', html: '' },
];

test('해시에서 slug를 꺼낸다', () => {
	assert.equal(slugFromHash(''), '');
	assert.equal(slugFromHash('#a'), 'a');
	assert.equal(slugFromHash(postHref('한글 글')), '한글 글');
	assert.equal(slugFromHash('#%E0%A4'), ''); // 깨진 인코딩은 목록으로
});

test('없는 글이나 빈 slug는 목록(null)', () => {
	assert.equal(findPost(posts, 'a')?.title, 'A');
	assert.equal(findPost(posts, ''), null);
	assert.equal(findPost(posts, 'nope'), null);
});

test('상태 문구와 오류 메시지', () => {
	assert.deepEqual(info('ok'), { message: 'ok', error: false });
	assert.deepEqual(failure('x'), { message: 'x', error: true });
	assert.equal(errorMessage(new Error('boom'), 'fallback'), 'boom');
	assert.equal(errorMessage('weird', 'fallback'), 'fallback');
});

test('날짜는 YYYY.MM.DD HH:mm', () => {
	assert.match(formatDate('2026-10-29T07:05:00Z'), /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/);
});
