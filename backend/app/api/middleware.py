import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_request_id, logger, set_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Read or generate request ID
        req_id = request.headers.get("X-Request-ID")
        if not req_id:
            req_id = f"req_{uuid.uuid4().hex[:12]}"

        # Store in request state and contextvar
        request.state.request_id = req_id
        set_request_id(req_id)

        start_time = time.perf_counter()
        logger.info("--> %s %s", request.method, request.url.path)

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            response.headers["X-Request-ID"] = req_id
            logger.info(
                "<-- %s %s status=%d duration=%.2fms",
                request.method, request.url.path, response.status_code, duration_ms
            )
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(
                "<-- %s %s error=%s duration=%.2fms",
                request.method, request.url.path, exc, duration_ms
            )
            raise
