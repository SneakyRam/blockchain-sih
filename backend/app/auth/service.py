from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx

from app.auth.passwords import verify_password
from app.auth.repository import PostgresRepository
from app.config import Settings


class AuthenticationError(Exception):
    pass


class AuthenticationUnavailable(Exception):
    pass


class AuthService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.repository = PostgresRepository(settings)

    async def startup(self) -> dict[str, Any]:
        import asyncio

        status = await asyncio.to_thread(self.repository.ensure_schema)
        if status.get("status") == "ok":
            if self.settings.admin_email and self.settings.admin_password:
                await asyncio.to_thread(self.repository.bootstrap_admin, self.settings.admin_email, self.settings.admin_password)
        return status

    def _require_session_secret(self) -> None:
        if not self.settings.session_secret:
            raise AuthenticationUnavailable("SESSION_SECRET is not configured")

    def _encode(self, payload: dict[str, Any]) -> str:
        self._require_session_secret()
        body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
        signature = hmac.new(self.settings.session_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        return f"{body}.{signature}"

    def decode_session(self, token: str | None) -> dict[str, Any] | None:
        if not token or not self.settings.session_secret:
            return None
        try:
            body, signature = token.split(".", 1)
            expected = hmac.new(self.settings.session_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected):
                return None
            data = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
            if int(data.get("exp", 0)) < int(time.time()):
                return None
            return data
        except (ValueError, TypeError, json.JSONDecodeError):
            return None

    async def login(self, email: str, password: str) -> tuple[str, dict[str, Any]]:
        import asyncio

        if not self.settings.session_secret:
            raise AuthenticationUnavailable("SESSION_SECRET is not configured")
        try:
            user = await asyncio.to_thread(self.repository.find_by_email, email.strip().lower())
        except Exception as exc:
            raise AuthenticationUnavailable(str(exc)) from exc
        if not user or not user.get("password_hash") or not verify_password(password, user["password_hash"]):
            raise AuthenticationError("Invalid email or password")
        await asyncio.to_thread(self.repository.mark_login, user["id"])
        await asyncio.to_thread(self.repository.record_audit, user["id"], "login", "auth", user["id"])
        token = self._encode({"sub": user["id"], "email": user["email"], "role": user["role"], "exp": int(time.time()) + 8 * 60 * 60})
        user.pop("password_hash", None)
        return token, user

    def google_start_url(self, state: str) -> str:
        if not self.settings.google_client_id or not self.settings.google_client_secret:
            raise AuthenticationUnavailable("Google OAuth is not configured")
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(
            {
                "client_id": self.settings.google_client_id,
                "redirect_uri": self.settings.google_redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "offline",
                "prompt": "select_account",
            }
        )

    async def google_login(self, code: str) -> tuple[str, dict[str, Any]]:
        import asyncio

        if not self.settings.google_client_id or not self.settings.google_client_secret:
            raise AuthenticationUnavailable("Google OAuth is not configured")
        async with httpx.AsyncClient(timeout=self.settings.http_timeout_seconds) as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": self.settings.google_client_id,
                    "client_secret": self.settings.google_client_secret,
                    "redirect_uri": self.settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise AuthenticationError("Google did not return an access token")
            profile_response = await client.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {access_token}"})
            profile_response.raise_for_status()
            profile = profile_response.json()
        email = str(profile.get("email") or "").lower()
        if not email or profile.get("email_verified") is not True:
            raise AuthenticationError("Google account email is not verified")
        hosted_domain = self.settings.google_allowed_hosted_domain.strip().lower()
        if hosted_domain and str(profile.get("hd") or "").lower() != hosted_domain:
            raise AuthenticationError("Google account is outside the allowed organization")
        try:
            user = await asyncio.to_thread(
                self.repository.create_or_update_google_user,
                str(profile.get("sub") or f"google:{email}"),
                email,
                str(profile.get("name") or email),
                str(profile.get("picture") or ""),
            )
            await asyncio.to_thread(self.repository.record_audit, user["id"], "google_login", "auth", user["id"])
        except Exception as exc:
            raise AuthenticationUnavailable(str(exc)) from exc
        token = self._encode({"sub": user["id"], "email": user["email"], "role": user["role"], "exp": int(time.time()) + 8 * 60 * 60})
        return token, user


_service: AuthService | None = None


def get_auth_service() -> AuthService:
    global _service
    from app.config import get_settings

    if _service is None:
        _service = AuthService(get_settings())
    return _service
