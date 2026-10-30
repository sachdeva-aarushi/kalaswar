import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status
from app.core.config import settings


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter for authentication endpoints.
    Protects against brute-force attacks and abuse.
    """

    def __init__(self, requests_per_minute: int = 15):
        self.requests_per_minute = requests_per_minute
        self.history: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        window_start = now - 60.0
        # Prune entries older than 60 seconds
        timestamps = [t for t in self.history[key] if t > window_start]
        self.history[key] = timestamps

        if len(timestamps) >= self.requests_per_minute:
            return True

        self.history[key].append(now)
        return False

    def check(self, request: Request):
        # Identify by client IP or X-Forwarded-For header
        client_ip = request.client.host if request.client else "127.0.0.1"
        if request.headers.get("x-forwarded-for"):
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()

        if self.is_rate_limited(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests on authentication endpoints. Please wait 60 seconds.",
                headers={"Retry-After": "60"},
            )

    def reset(self):
        """Helper to reset rate limits in unit tests."""
        self.history.clear()


auth_rate_limiter = InMemoryRateLimiter(requests_per_minute=15)


def rate_limit_auth(request: Request):
    """Dependency that applies rate limiting to auth endpoints."""
    auth_rate_limiter.check(request)

