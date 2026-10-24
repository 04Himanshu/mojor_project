import time
import threading
from typing import Dict, List, Tuple, Optional
from fastapi import Request, HTTPException, status
from app.core.config import settings

class InMemoryRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Tracks timestamps of requests per identifier and cleans up expired records.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._records: Dict[str, List[float]] = {}
        self._last_cleanup = time.time()

    def _cleanup_old_keys(self, now: float, max_idle: float = 3600.0):
        """Remove keys that have had no activity for over an hour."""
        if now - self._last_cleanup < 300:  # Run at most once every 5 minutes
            return
        self._last_cleanup = now
        stale_keys = []
        for key, timestamps in self._records.items():
            if not timestamps or (now - timestamps[-1] > max_idle):
                stale_keys.append(key)
        for k in stale_keys:
            self._records.pop(k, None)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        """
        Check if an action with 'key' is rate limited.
        Returns:
            (is_limited: bool, remaining_requests: int, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            self._cleanup_old_keys(now)
            
            timestamps = self._records.get(key, [])
            # Filter timestamps in current window
            valid_timestamps = [ts for ts in timestamps if ts > window_start]
            
            if len(valid_timestamps) >= max_requests:
                earliest_ts = valid_timestamps[0]
                retry_after = max(1, int(earliest_ts + window_seconds - now))
                self._records[key] = valid_timestamps
                return True, 0, retry_after
            
            # Record this attempt
            valid_timestamps.append(now)
            self._records[key] = valid_timestamps
            remaining = max(0, max_requests - len(valid_timestamps))
            return False, remaining, 0

    def reset(self, key: str):
        """Reset attempts for a specific key (e.g., upon successful login)."""
        with self._lock:
            self._records.pop(key, None)

limiter = InMemoryRateLimiter()

def get_client_ip(request: Request) -> str:
    """Extract client IP handling proxies / load balancers if present."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

def rate_limit(
    max_requests: Optional[int] = None,
    window_seconds: Optional[int] = None,
    key_prefix: str = "general"
):
    """
    FastAPI dependency factory to enforce rate limiting on specific endpoints.
    """
    limit = max_requests if max_requests is not None else settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS
    window = window_seconds if window_seconds is not None else settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS

    async def dependency(request: Request):
        client_ip = get_client_ip(request)
        rate_key = f"{key_prefix}:{client_ip}"
        
        is_limited, remaining, retry_after = limiter.is_rate_limited(
            key=rate_key,
            max_requests=limit,
            window_seconds=window
        )
        
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: Too many attempts. Please wait {retry_after} second(s) before trying again.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0"
                }
            )

    return dependency
