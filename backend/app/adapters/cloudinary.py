import hashlib
import time
from typing import Any, Dict, Optional, Union
import httpx
from app.core.config import settings
from app.core.logging import logger


class CloudinaryAdapter:
    """
    Cloudinary Media Pipeline Adapter.
    Provides:
      - Signed upload with auto-format / auto-quality (f_auto, q_auto)
      - Background cleanup for standardized e-commerce listing cards
      - Dynamic Geographical Indication (GI) verification watermark badge overlay on approval
    Falls back gracefully to deterministic demo URLs when Cloudinary API keys are absent.
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
            return ""
        sorted_pairs = [f"{k}={v}" for k, v in sorted(params.items()) if v is not None and k != "file"]
        to_sign = "&".join(sorted_pairs) + self.api_secret
        return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

    async def upload_image(
        self,
        media_source: Union[str, bytes],
        phone: str,
        background_clean: bool = True,
    ) -> Dict[str, Any]:
        """
        Uploads product photo to Cloudinary.
        Applies f_auto, q_auto, and background cleaning when live keys are configured.
        Returns dictionary containing url, public_id, and mode.
        """
        clean_phone = phone.replace("+", "").strip()
        timestamp = int(time.time())
        public_id = f"kalaswar/artisans/{clean_phone}_{timestamp}"

        if not self.is_configured:
            logger.info("Cloudinary unconfigured; utilizing deterministic mock asset.")
            # Deterministic demo URL with Cloudinary optimization transforms
            demo_url = (
                f"https://res.cloudinary.com/kalaswar-demo/image/upload/"
                f"f_auto,q_auto,e_improve,c_fill,w_800,h_800/{public_id}.webp"
            )
            return {
                "public_id": public_id,
                "url": demo_url,
                "secure_url": demo_url,
                "format": "webp",
                "width": 800,
                "height": 800,
                "mode": "demo",
            }

        # Live Cloudinary Signed Upload
        upload_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/image/upload"
        params_to_sign = {
            "folder": "kalaswar/artisans",
            "public_id": f"{clean_phone}_{timestamp}",
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
            "public_id": params_to_sign["public_id"],
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
            # Fallback if invalid string
            data["file"] = "https://res.cloudinary.com/demo/image/upload/sample.jpg"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(upload_url, data=data, files=files)
                res.raise_for_status()
                res_json = res.json()
                return {
                    "public_id": res_json.get("public_id", public_id),
                    "url": res_json.get("secure_url", res_json.get("url")),
                    "secure_url": res_json.get("secure_url"),
                    "format": res_json.get("format", "webp"),
                    "width": res_json.get("width"),
                    "height": res_json.get("height"),
                    "mode": "live",
                }
        except Exception as e:
            logger.warning("Cloudinary live upload failed: %s. Falling back to demo asset.", e)
            demo_fallback = f"https://res.cloudinary.com/kalaswar-demo/image/upload/f_auto,q_auto/{public_id}.webp"
            return {
                "public_id": public_id,
                "url": demo_fallback,
                "secure_url": demo_fallback,
                "format": "webp",
                "mode": "demo_fallback",
            }

    def apply_gi_watermark(self, public_id: str, craft_name: str = "Aari Hand Embroidery") -> str:
        """
        Overlays Geographical Indication (GI) verification badge on the approved product image.
        Format: l_kalaswar_gi_badge,w_130,g_south_east,x_20,y_20,o_90
        """
        cname = self.cloud_name if self.is_configured else "kalaswar-demo"
        # Standard Cloudinary layer transformation for authentic GI badge overlay
        watermarked_url = (
            f"https://res.cloudinary.com/{cname}/image/upload/"
            f"l_kalaswar_gi_badge,w_130,g_south_east,x_20,y_20,o_90/"
            f"f_auto,q_auto/{public_id}.webp"
        )
        return watermarked_url


cloudinary_adapter = CloudinaryAdapter()
