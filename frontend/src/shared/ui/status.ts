/** 폼 아래 상태 문구. 훅이 만들고 StatusLine 컴포넌트가 그린다. */
export type Status = { message: string; error: boolean };

export const NO_STATUS: Status = { message: '', error: false };
export const info = (message: string): Status => ({ message, error: false });
export const failure = (message: string): Status => ({ message, error: true });

/** 예외에서 사람이 읽을 메시지를 꺼낸다. */
export const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
