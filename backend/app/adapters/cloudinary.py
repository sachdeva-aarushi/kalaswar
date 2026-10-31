import hashlib
import time
from typing import Any, Dict, Optional, Union
import httpx
from app.core.config import settings
from app.core.logging import logger

FALLBACK_SVG_DATA_URL = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>"
    "<rect width='400' height='400' fill='%23f5ede4'/>"
    "<circle cx='200' cy='170' r='60' fill='%23c97a48' opacity='0.3'/>"
    "<path d='M160 260 L240 260 L220 230 L180 230 Z' fill='%239e4a28'/>"
    "<text x='200' y='320' font-family='sans-serif' font-size='18' text-anchor='middle' fill='%23703920'>Kalaswar Authentic Craft</text>"
    "</svg>"
)


class CloudinaryAdapter:
    """
    Cloudinary Media Pipeline Adapter.
    Enforces real signed uploads with f_auto,q_auto optimizations.
    Mock fallback is strictly restricted to test mode (APP_ENV=test).
    """

    def __init__(
        self,
        cloud_name: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
    ):
        self.cloud_name = cloud_name or settings.CLOUDINARY_CLOUD_NAME
        self.api_key = api_key or settings.CLOUDINARY_API_KEY
        self.api_secret = api_secret or settings.CLOUDINARY_API_SECRET

    @property
    def is_configured(self) -> bool:
        return bool(self.cloud_name and self.api_key and self.api_secret)

    def generate_signature(self, params: Dict[str, Any]) -> str:
        """Generates SHA1 signature for Cloudinary signed upload."""
        if not self.api_secret:
            if settings.is_test:
                return "test_mock_signature"
            raise RuntimeError("Cannot sign Cloudinary upload: CLOUDINARY_API_SECRET is missing.")
        sorted_pairs = [f"{k}={v}" for k, v in sorted(params.items()) if v is not None and k != "file"]
        to_sign = "&".join(sorted_pairs) + self.api_secret
        return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

    def get_signed_upload_params(self, folder: str = "kalaswar/products") -> Dict[str, Any]:
        """Generates signed upload parameters for client-side direct upload to Cloudinary."""
        if not self.is_configured and not settings.is_test:
            raise RuntimeError("Cloudinary is not configured. Missing Cloudinary API credentials.")

        timestamp = int(time.time())
        params = {
            "folder": folder,
            "timestamp": timestamp,
            "transformation": "f_auto,q_auto",
        }
        signature = self.generate_signature(params)
        return {
            "cloud_name": self.cloud_name or "kalaswar-test",
            "api_key": self.api_key or "test_key",
            "timestamp": timestamp,
            "folder": folder,
            "transformation": "f_auto,q_auto",
            "signature": signature,
            "upload_url": f"https://api.cloudinary.com/v1_1/{self.cloud_name or 'kalaswar-test'}/image/upload",
        }

    async def upload_image(
        self,
        media_source: Union[str, bytes],
        folder: str = "kalaswar/products",
        phone: Optional[str] = None,
        background_clean: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Uploads product photo to Cloudinary with f_auto,q_auto.
        In production/development, refuses to return mock assets.
        In test mode (APP_ENV=test), returns deterministic mock asset.
        """
        timestamp = int(time.time())
        if phone:
            clean_phone = phone.replace("+", "").strip()
            public_id = f"{folder}/{clean_phone}_{timestamp}"
        else:
            public_id = f"{folder}/upload_{timestamp}"

        if not self.is_configured:
            if not settings.is_test:
                raise RuntimeError("Cloudinary media upload failed: Missing Cloudinary API credentials.")
            # Deterministic test mock
            test_url = f"https://res.cloudinary.com/kalaswar-test/image/upload/f_auto,q_auto/{public_id}.webp"
            return {
                "public_id": public_id,
                "url": test_url,
                "secure_url": test_url,
                "format": "webp",
                "width": 800,
                "height": 800,
                "mode": "test_mock",
            }

        # Real Live Cloudinary Signed Upload
        upload_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/image/upload"
        params_to_sign = {
            "folder": folder,
            "timestamp": timestamp,
        }
        if background_clean:
            params_to_sign["transformation"] = "f_auto,q_auto,e_background_removal"
        else:
            params_to_sign["transformation"] = "f_auto,q_auto"

        signature = self.generate_signature(params_to_sign)

        data = {
            "timestamp": timestamp,
            "folder": params_to_sign["folder"],
            "transformation": params_to_sign["transformation"],
            "api_key": self.api_key,
            "signature": signature,
        }

        files = None
        if isinstance(media_source, bytes):
            files = {"file": media_source}
        elif isinstance(media_source, str) and (media_source.startswith("http://") or media_source.startswith("https://") or media_source.startswith("data:")):
            data["file"] = media_source
        else:
            raise ValueError("Invalid media_source: must be image bytes, http(s) URL, or data URI.")

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(upload_url, data=data, files=files)
                res.raise_for_status()
                res_json = res.json()
                secure_url = res_json.get("secure_url") or res_json.get("url")
                # Ensure f_auto,q_auto is embedded if not present
                if "/image/upload/" in secure_url and "f_auto" not in secure_url:
                    secure_url = secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto/")
                return {
                    "public_id": res_json.get("public_id", public_id),
                    "url": secure_url,
                    "secure_url": secure_url,
                    "format": res_json.get("format", "webp"),
                    "width": res_json.get("width", 800),
                    "height": res_json.get("height", 800),
                    "mode": "live",
                }
        except Exception as e:
            logger.error("Cloudinary live upload error: %s", e)
            if settings.is_test:
                test_url = f"https://res.cloudinary.com/kalaswar-test/image/upload/f_auto,q_auto/{public_id}.webp"
                return {
                    "public_id": public_id,
                    "url": test_url,
                    "secure_url": test_url,
                    "format": "webp",
                    "mode": "test_mock",
                }
            raise RuntimeError(f"Cloudinary image upload failed: {e}")

    def apply_gi_watermark(self, public_id: str, craft_name: str = "Aari Hand Embroidery") -> str:
        """
        Overlays Geographical Indication (GI) verification badge with f_auto,q_auto.
        """
        cname = self.cloud_name if self.is_configured else "kalaswar-test"
        return (
            f"https://res.cloudinary.com/{cname}/image/upload/"
            f"l_kalaswar_gi_badge,w_130,g_south_east,x_20,y_20,o_90/"
            f"f_auto,q_auto/{public_id}.webp"
        )

    def get_fallback_url(self) -> str:
        """Returns reliable SVG fallback for missing or blocked images."""
        return FALLBACK_SVG_DATA_URL


cloudinary_adapter = CloudinaryAdapter()
