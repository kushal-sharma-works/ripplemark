import base64
import json
from typing import Any


def decode_jwt_payload(token: str) -> dict[str, Any] | None:
    try:
        parts = token.split('.')
        if len(parts) < 2:
            return None
        payload = parts[1]
        padding = '=' * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding)
        return json.loads(decoded.decode('utf-8'))
    except Exception:
        return None


def verify_decoded_payload(payload: dict[str, Any] | None) -> bool:
    if not payload:
        return False
    return isinstance(payload.get('sub'), str) and isinstance(payload.get('email'), str)
