"""비밀번호 해시 구현. 알고리즘을 바꾸려면 PasswordHasher를 따르는 새 클래스를 만들면 된다(OCP)."""

import hashlib
import hmac
import secrets


class Pbkdf2PasswordHasher:
    """PBKDF2-HMAC-SHA256. 저장 형식: '<salt hex>$<digest hex>'."""

    def __init__(self, iterations: int = 200_000, salt_bytes: int = 16):
        self._iterations = iterations
        self._salt_bytes = salt_bytes

    def hash(self, password: str) -> str:
        salt = secrets.token_bytes(self._salt_bytes)
        return f"{salt.hex()}${self._digest(password, salt).hex()}"

    def verify(self, password: str, hashed: str) -> bool:
        try:
            salt_hex, digest_hex = hashed.split("$", 1)
            salt = bytes.fromhex(salt_hex)
        except ValueError:
            return False
        return hmac.compare_digest(self._digest(password, salt).hex(), digest_hex)

    def _digest(self, password: str, salt: bytes) -> bytes:
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, self._iterations)
