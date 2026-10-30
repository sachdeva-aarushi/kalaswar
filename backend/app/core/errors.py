from typing import Any, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_request_id, logger


class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class AuthError(AppException):
    def __init__(self, message: str = "Authentication required or invalid token", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Access forbidden for current user role", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class NotFoundError(AppException):
    def __init__(self, message: str = "Requested resource not found", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


def _sanitize_details(obj: Any) -> Any:
    if isinstance(obj, list):
        return [_sanitize_details(item) for item in obj]
    if isinstance(obj, dict):
        return {k: _sanitize_details(v) for k, v in obj.items()}
    if isinstance(obj, Exception):
        return str(obj)
    return obj


def build_error_response(
    status_code: int,
    code: str,
    message: str,
    request_id: Optional[str] = None,
    details: Optional[Any] = None,
    headers: Optional[dict] = None,
) -> JSONResponse:
    rid = request_id or get_request_id() or "unknown"
    payload = {
        "error": {
            "code": code,
            "message": message,
            "status_code": status_code,
            "request_id": rid,
            "details": _sanitize_details(details),
        }
    }
    resp_headers = {"X-Request-ID": rid}
    if headers:
        for k, v in headers.items():
            resp_headers[k] = str(v)
    return JSONResponse(status_code=status_code, content=payload, headers=resp_headers)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning("Application exception: code=%s, status=%d, msg=%s", exc.code, exc.status_code, exc.message)
    return build_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        request_id=getattr(request.state, "request_id", None),
        details=exc.details,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning("Request validation error: %s", exc.errors())
    return build_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Request payload or parameters failed validation",
        request_id=getattr(request.state, "request_id", None),
        details=exc.errors(),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    logger.warning("HTTP exception: status=%d, detail=%s", exc.status_code, exc.detail)
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "FORBIDDEN"

    return build_error_response(
        status_code=exc.status_code,
        code=code,
        message=str(exc.detail),
        request_id=getattr(request.state, "request_id", None),
        headers=getattr(exc, "headers", None),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server exception: %s", exc)
    return build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred",
        request_id=getattr(request.state, "request_id", None),
    )
