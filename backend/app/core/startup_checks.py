from app.core.config import settings
from app.core.logging import logger


def verify_production_credentials_on_startup():
    """
    Enforces real infrastructure keys outside of test mode.
    Outside APP_ENV=test (or ENVIRONMENT=test), missing keys for Cloudinary,
    Speech-to-Text, or LLM make the server refuse to start with a clear, actionable error.
    """
    if settings.is_test:
        logger.info("[Startup] Test environment detected (APP_ENV=test). Mock adapters permitted.")
        return

    missing_keys = []

    # 1. Cloudinary Media Pipeline Keys
    if not settings.CLOUDINARY_CLOUD_NAME:
        missing_keys.append("CLOUDINARY_CLOUD_NAME")
    if not settings.CLOUDINARY_API_KEY:
        missing_keys.append("CLOUDINARY_API_KEY")
    if not settings.CLOUDINARY_API_SECRET:
        missing_keys.append("CLOUDINARY_API_SECRET")

    # 2. Speech-to-Text (STT) Keys - At least one required
    if not settings.SARVAM_API_KEY and not settings.OPENAI_API_KEY:
        missing_keys.append("SPEECH_TO_TEXT (SARVAM_API_KEY or OPENAI_API_KEY)")

    # 3. LLM Extraction Keys - At least one required
    if not settings.OPENAI_API_KEY and not settings.GEMINI_API_KEY:
        missing_keys.append("LLM (OPENAI_API_KEY or GEMINI_API_KEY)")

    if missing_keys:
        err_msg = (
            "\n" + "=" * 80 + "\n"
            "CRITICAL STARTUP FAILURE: Missing Required Production Credentials\n"
            "=" * 80 + "\n"
            f"Active Environment: {settings.APP_ENV or settings.ENVIRONMENT}\n"
            "Kalaswar Core Services refuses to run with mock adapters in non-test mode.\n\n"
            "The following required environment variable(s) must be provided in backend/.env:\n"
            + "\n".join(f"  * {k}" for k in missing_keys)
            + "\n\nTo run tests with mock adapters, set APP_ENV=test or run pytest.\n"
            + "=" * 80 + "\n"
        )
        logger.critical(err_msg)
        raise RuntimeError(err_msg)

    logger.info("[Startup] All required production infrastructure credentials validated.")

