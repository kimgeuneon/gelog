import { usePart } from '../lib/usePart';
import DeckPlayer from './DeckPlayer';

type Props = { file: string; title: string; openPart: <T>(file: string) => Promise<T> };

/** 발표 파일을 받아서 여는 동안의 상태를 보여 주고, 다 받으면 플레이어를 띄운다. */
export default function DeckSection({ file, title, openPart }: Props) {
	const deck = usePart<string>(file, openPart);
	if (deck.kind === 'loading') return <p className="deck-loading">발표 슬라이드를 불러오는 중…</p>;
	if (deck.kind === 'error') return <p className="status error">{deck.message}</p>;
	return <DeckPlayer html={deck.value} title={title} />;
}
