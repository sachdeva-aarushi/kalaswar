"""
Backwards compatibility shim for app.config.
Preferred import path: from app.core.config import settings, Settings
"""
from app.core.config import Settings, settings

__all__ = ["Settings", "settings"]
