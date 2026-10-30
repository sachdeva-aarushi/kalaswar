from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_current_user, get_supabase
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationSummaryResponse,
)

router = APIRouter(prefix="/notifications", tags=["System & User Notifications"])

DEMO_NOTIFICATIONS: List[dict] = [
    {
        "id": "cccc3333-0001-0000-0000-000000000001",
        "audience": "coordinator",
        "audience_ref": "coordinator_all",
        "event_type": "order_update",
        "title": "New Order Placed",
        "body": "Customer order for Handcrafted Kantha Silk Cushion Cover received and awaiting artisan assignment.",
        "link": "/orders/22222222-0001-0000-0000-000000000001",
        "read_at": None,
        "created_at": "2026-10-29T10:00:00Z",
    },
    {
        "id": "cccc3333-0002-0000-0000-000000000002",
        "audience": "coordinator",
        "audience_ref": "coordinator_all",
        "event_type": "stock_alert",
        "title": "Low Stock Warning: Cotton Embroidery Threads",
        "body": "Cotton threads stock has dropped to 15 skeins (threshold: 25 skeins). Raw material order required.",
        "link": "/inventory/materials",
        "read_at": None,
        "created_at": "2026-10-29T12:00:00Z",
    },
    {
        "id": "cccc3333-0003-0000-0000-000000000003",
        "audience": "artisan",
        "audience_ref": "cccccccc-0001-0000-0000-000000000001",
        "event_type": "dbt_payout",
        "title": "DBT Wage Credited",
        "body": "₹1,250.00 transferred to your bank account for Kantha Silk Dupatta finishing.",
        "link": "/payouts",
        "read_at": "2026-10-28T17:00:00Z",
        "created_at": "2026-10-28T16:05:00Z",
    },
]


def _build_notification_response(n: dict) -> NotificationResponse:
    read_at_str = str(n.get("read_at")) if n.get("read_at") else None
    return NotificationResponse(
        id=UUID(str(n["id"])),
        audience=n["audience"],
        audience_ref=n.get("audience_ref"),
        event_type=n.get("event_type", "general"),
        title=n["title"],
        body=n.get("body"),
        link=n.get("link"),
        read_at=read_at_str,
        is_read=read_at_str is not None,
        created_at=str(n.get("created_at", "")),
    )


@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    audience: Optional[str] = Query(None, description="Filter by audience (coordinator, artisan, buyer)"),
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    current_user: Optional[CurrentUser] = Depends(get_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    List notifications for current audience or user.
    """
    notifs = list(DEMO_NOTIFICATIONS)

    if audience:
        notifs = [n for n in notifs if n.get("audience") == audience]
    elif current_user:
        # Filter based on current user roles
        allowed_audiences = set()
        if current_user.has_role("coordinator"):
            allowed_audiences.add("coordinator")
        if current_user.has_role("artisan"):
            allowed_audiences.add("artisan")
        if current_user.has_role("buyer"):
            allowed_audiences.add("buyer")
        if allowed_audiences:
            notifs = [n for n in notifs if n.get("audience") in allowed_audiences]

    if unread_only:
        notifs = [n for n in notifs if not n.get("read_at")]

    return [_build_notification_response(n) for n in notifs]


@router.get("/summary", response_model=NotificationSummaryResponse)
async def get_notifications_summary(
    audience: Optional[str] = Query(None, description="Audience filter"),
    current_user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    Get unread and total notification counts.
    """
    notifs = list(DEMO_NOTIFICATIONS)
    if audience:
        notifs = [n for n in notifs if n.get("audience") == audience]

    unread = sum(1 for n in notifs if not n.get("read_at"))
    return NotificationSummaryResponse(unread_count=unread, total_count=len(notifs))


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreate,
    current_user: Optional[CurrentUser] = Depends(get_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Create a new system notification.
    """
    new_id = uuid4()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(new_id),
        "audience": payload.audience,
        "audience_ref": payload.audience_ref,
        "event_type": payload.event_type,
        "title": payload.title,
        "body": payload.body,
        "link": payload.link,
        "read_at": None,
        "created_at": now_iso,
    }
    DEMO_NOTIFICATIONS.insert(0, record)

    try:
        await db.insert_record("notifications", {
            "id": str(new_id),
            "audience": payload.audience,
            "audience_ref": payload.audience_ref,
            "event_type": payload.event_type,
            "title": payload.title,
            "body": payload.body,
            "link": payload.link,
        })
    except Exception as e:
        logger.warning("DB insert notification warning: %s", e)

    return _build_notification_response(record)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: Optional[CurrentUser] = Depends(get_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Mark a notification as read.
    """
    notif = next((n for n in DEMO_NOTIFICATIONS if str(n["id"]) == str(notification_id)), None)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Notification '{notification_id}' not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    notif["read_at"] = now_iso

    try:
        await db.update_records("notifications", {"id": f"eq.{notification_id}"}, {"read_at": now_iso})
    except Exception as e:
        logger.warning("DB update notification warning: %s", e)

    return _build_notification_response(notif)
