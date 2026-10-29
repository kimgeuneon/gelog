const pad = (n: number) => String(n).padStart(2, '0');

/** ISO 시각을 'YYYY.MM.DD HH:mm'으로. */
export function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
