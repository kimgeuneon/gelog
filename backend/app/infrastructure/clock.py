"""시간 공급자. 테스트에서는 고정된 시계를 주입할 수 있다."""

from datetime import datetime, timezone


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(timezone.utc)
