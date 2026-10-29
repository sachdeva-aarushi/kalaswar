import contextvars
import logging
import sys
from typing import Optional

# Context variable to hold request_id across async execution
request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)


def get_request_id() -> Optional[str]:
    return request_id_ctx.get()


def set_request_id(request_id: str) -> None:
    request_id_ctx.set(request_id)


class RequestIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestIDFilter())
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [req:%(request_id)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Remove existing handlers to prevent duplicate lines
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)


logger = logging.getLogger("kalaswar.backend")
