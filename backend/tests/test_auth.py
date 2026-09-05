from app.auth.passwords import hash_password, verify_password
from app.auth.service import AuthService
from app.config import Settings


def test_password_hash_round_trip():
    encoded = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("wrong password", encoded)


def test_session_round_trip():
    settings = Settings(session_secret="test-secret")
    service = AuthService(settings)
    token = service._encode({"sub": "user-1", "email": "officer@example.com", "exp": 4_000_000_000})
    assert service.decode_session(token)["email"] == "officer@example.com"
    assert service.decode_session(token + "x") is None
