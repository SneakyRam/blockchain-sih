from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


_ITERATIONS = 310_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    encode = lambda value: base64.urlsafe_b64encode(value).decode().rstrip("=")
    return f"pbkdf2_sha256${_ITERATIONS}${encode(salt)}${encode(digest)}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        decode = lambda value: base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), decode(salt), int(iterations))
        return hmac.compare_digest(actual, decode(expected))
    except (TypeError, ValueError):
        return False
