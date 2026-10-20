import { useState } from 'react';

// TODO: FastAPI 백엔드가 생기면 좋아요 수를 API에서 불러오고 저장하도록 변경
export default function LikeButton() {
	const [liked, setLiked] = useState(false);
	const [count, setCount] = useState(0);

	const toggle = () => {
		setLiked(!liked);
		setCount(count + (liked ? -1 : 1));
	};

	return (
		<button
			type="button"
			onClick={toggle}
			aria-pressed={liked}
			style={{
				display: 'block',
				margin: '2em auto 0',
				padding: '0.5em 1.2em',
				border: '1px solid rgb(var(--gray-light))',
				borderRadius: '999px',
				background: liked ? 'rgb(var(--gray-light))' : 'white',
				cursor: 'pointer',
				fontSize: '1rem',
			}}
		>
			{liked ? '❤️' : '🤍'} {count}
		</button>
	);
}
