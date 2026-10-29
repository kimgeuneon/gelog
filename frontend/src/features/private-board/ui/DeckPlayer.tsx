import { useRef } from 'react';

/**
 * 발표 슬라이드를 sandbox iframe으로 띄운다.
 * allow-same-origin을 주지 않아서 iframe 안의 코드는 이 페이지(열쇠가 든 sessionStorage 등)에 접근할 수 없다.
 */
export default function DeckPlayer({ html, title }: { html: string; title: string }) {
	const frame = useRef<HTMLIFrameElement>(null);

	function fullscreen() {
		frame.current?.requestFullscreen?.().catch(() => {});
		frame.current?.focus();
	}

	return (
		<div className="deck-player">
			<iframe ref={frame} className="deck-frame" title={`${title} 발표 슬라이드`} sandbox="allow-scripts"
				allow="fullscreen" allowFullScreen srcDoc={html} />
			<div className="deck-bar">
				<span>슬라이드를 한 번 누른 뒤 → / Space 로 넘기기</span>
				<button type="button" className="btn-primary" onClick={fullscreen}>
					전체화면으로 발표
				</button>
			</div>
		</div>
	);
}
