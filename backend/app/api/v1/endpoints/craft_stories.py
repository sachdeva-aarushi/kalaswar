from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_optional_current_user, get_supabase, require_roles
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.craft_story import CraftStoryCreate, CraftStoryResponse, CraftStoryUpdate
from app.services.audit import AuditService, audit_service

router = APIRouter(prefix="/craft-stories", tags=["Living Craft Stories & Provenance"])

DEMO_STORIES: List[dict] = [
    {
        "id": "aaaa1111-0001-0000-0000-000000000001",
        "product_id": "11111111-0001-0000-0000-000000000001",
        "artisan_id": "cccccccc-0001-0000-0000-000000000001",
        "artisan_name": "Radha Devi",
        "shg_id": "bbbbbbbb-0001-0000-0000-000000000001",
        "title": "Songs in the Running Stitch: The Living Heritage of Santiniketan Kantha",
        "body": "Kantha embroidery in Bolpur is an heirloom art passed across four generations of rural women. "
        "Each stitch is sewn by hand using discarded silk saris and lac-dyed threads, depicting monsoon lotus blossoms.",
        "language": "en",
        "status": "published",
        "source_notes": "Recorded during evening artisan circle in Bolpur workshop.",
        "original_notes": "हम इसे बारिश के दिनों में बैठ कर बनाते हैं जब खेतों में काम कम होता है।",
        "ai_assisted": True,
        "approved_by": "Coordinator Amit",
        "approved_at": "2026-10-25T15:00:00Z",
        "created_at": "2026-10-24T10:00:00Z",
        "updated_at": "2026-10-25T15:00:00Z",
        "consents": [
            {"consent_type": "maker_name", "granted": True},
            {"consent_type": "maker_photo", "granted": True},
            {"consent_type": "voice_transcript", "granted": True},
            {"consent_type": "marketing_reuse", "granted": True},
        ],
    }
]


def _build_story_response(s: dict) -> CraftStoryResponse:
    return CraftStoryResponse(
        id=UUID(str(s["id"])),
        product_id=UUID(str(s["product_id"])) if s.get("product_id") else None,
        artisan_id=UUID(str(s["artisan_id"])) if s.get("artisan_id") else None,
        artisan_name=s.get("artisan_name"),
        shg_id=UUID(str(s["shg_id"])) if s.get("shg_id") else None,
        title=s["title"],
        body=s["body"],
        language=s.get("language", "en"),
        status=s.get("status", "draft"),
        source_notes=s.get("source_notes"),
        original_notes=s.get("original_notes"),
        ai_assisted=bool(s.get("ai_assisted", False)),
        approved_by=s.get("approved_by"),
        approved_at=str(s.get("approved_at")) if s.get("approved_at") else None,
        created_at=str(s.get("created_at", "")),
        updated_at=str(s.get("updated_at", "")),
        consents=s.get("consents", []),
    )


@router.get("", response_model=List[CraftStoryResponse])
@router.get("/", response_model=List[CraftStoryResponse])
async def list_craft_stories(
    product_id: Optional[UUID] = Query(None, description="Filter by product"),
    artisan_id: Optional[UUID] = Query(None, description="Filter by artisan"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, published)"),
    user: Optional[CurrentUser] = Depends(get_optional_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    List cultural craft stories and artisan provenance narratives.
    Public visitors see published stories; coordinators and admins see all.
    """
    stories = list(DEMO_STORIES)

    if product_id:
        stories = [s for s in stories if str(s.get("product_id")) == str(product_id)]

    if artisan_id:
        stories = [s for s in stories if str(s.get("artisan_id")) == str(artisan_id)]

    # If unauthenticated or buyer, default to published only unless specific role
    is_staff = user and user.has_any_role(["coordinator", "admin", "artisan"])
    if status_filter:
        stories = [s for s in stories if s.get("status") == status_filter]
    elif not is_staff:
        stories = [s for s in stories if s.get("status") == "published"]

    return [_build_story_response(s) for s in stories]


@router.get("/{story_id}", response_model=CraftStoryResponse)
async def get_craft_story(
    story_id: UUID,
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Retrieve single craft story with maker consent profile.
    """
    story = next((s for s in DEMO_STORIES if str(s["id"]) == str(story_id)), None)
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Craft story '{story_id}' not found")
    return _build_story_response(story)


@router.post("", response_model=CraftStoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CraftStoryResponse, status_code=status.HTTP_201_CREATED)
async def create_craft_story(
    payload: CraftStoryCreate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin", "artisan"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Submit a living craft story draft with artisan raw notes and consent flags.
    """
    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "product_id": str(payload.product_id) if payload.product_id else None,
        "artisan_id": str(payload.artisan_id) if payload.artisan_id else None,
        "shg_id": str(payload.shg_id) if payload.shg_id else None,
        "title": payload.title,
        "body": payload.body,
        "language": payload.language,
        "status": "draft",
        "source_notes": payload.source_notes,
        "original_notes": payload.original_notes,
        "ai_assisted": payload.ai_assisted,
        "approved_by": None,
        "approved_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
        "consents": [c.model_dump() for c in payload.consents],
    }
    DEMO_STORIES.append(record)

    try:
        await db.insert_record("craft_stories", {
            "id": str(new_id),
            "product_id": str(payload.product_id) if payload.product_id else None,
            "artisan_id": str(payload.artisan_id) if payload.artisan_id else None,
            "shg_id": str(payload.shg_id) if payload.shg_id else None,
            "title": payload.title,
            "body": payload.body,
            "language": payload.language,
            "status": "draft",
            "source_notes": payload.source_notes,
            "original_notes": payload.original_notes,
            "ai_assisted": payload.ai_assisted,
        })
    except Exception as e:
        logger.warning("DB craft story insert warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="craft_story_created",
        entity_type="craft_story",
        entity_id=str(new_id),
        details={"title": payload.title, "ai_assisted": payload.ai_assisted},
    )

    return _build_story_response(record)


@router.patch("/{story_id}", response_model=CraftStoryResponse)
async def update_craft_story(
    story_id: UUID,
    payload: CraftStoryUpdate,
    current_user: CurrentUser = Depends(require_roles(["coordinator", "admin"])),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Update or approve/publish a craft story. Requires coordinator or admin role.
    """
    story = next((s for s in DEMO_STORIES if str(s["id"]) == str(story_id)), None)
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Craft story '{story_id}' not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = payload.model_dump(exclude_unset=True)

    if payload.status == "published":
        story["approved_by"] = current_user.email
        story["approved_at"] = now_iso

    story.update(update_data)
    story["updated_at"] = now_iso

    try:
        await db.update_records("craft_stories", {"id": f"eq.{story_id}"}, update_data)
    except Exception as e:
        logger.warning("DB update warning: %s", e)

    await audit.log_action(
        user_id=current_user.id,
        action="craft_story_updated",
        entity_type="craft_story",
        entity_id=str(story_id),
        details=update_data,
    )

    return _build_story_response(story)
