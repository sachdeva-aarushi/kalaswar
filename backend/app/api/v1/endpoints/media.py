from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from app.adapters.cloudinary import CloudinaryAdapter, FALLBACK_SVG_DATA_URL, cloudinary_adapter
from app.core.config import settings

router = APIRouter(prefix="/media", tags=["Media Pipeline & Cloudinary Uploads"])


@router.post("/sign")
async def get_signed_upload_parameters(
    folder: str = "kalaswar/products",
    adapter: CloudinaryAdapter = Depends(lambda: cloudinary_adapter),
) -> Dict[str, Any]:
    """
    Generates a cryptographically signed parameter set for direct client-to-Cloudinary uploads.
    Includes f_auto,q_auto transformation guarantees.
    """
    try:
        return adapter.get_signed_upload_params(folder=folder)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate upload signature: {str(e)}",
        )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media_file(
    file: UploadFile = File(..., description="Image file to upload (JPEG, PNG, WebP)"),
    folder: str = Form("kalaswar/products"),
    background_clean: bool = Form(False),
    adapter: CloudinaryAdapter = Depends(lambda: cloudinary_adapter),
) -> Dict[str, Any]:
    """
    Backend-mediated image upload to Cloudinary.
    Accepts multipart file, applies f_auto,q_auto, and returns public_id and optimized URL.
    """
    # Basic MIME validation
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or content_type == "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Only images are supported.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        result = await adapter.upload_image(
            media_source=file_bytes,
            folder=folder,
            background_clean=background_clean,
        )
        return {
            "status": "success",
            "url": result.get("secure_url") or result.get("url"),
            "secure_url": result.get("secure_url") or result.get("url"),
            "public_id": result.get("public_id"),
            "format": result.get("format", "webp"),
            "width": result.get("width"),
            "height": result.get("height"),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image upload to Cloudinary failed: {str(e)}",
        )


@router.get("/fallback")
async def get_fallback_asset():
    """Returns SVG vector graphic fallback for missing or blocked images."""
    return {
        "status": "success",
        "fallback_url": FALLBACK_SVG_DATA_URL,
    }

