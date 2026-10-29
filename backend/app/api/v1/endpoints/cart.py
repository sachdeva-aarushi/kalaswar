from typing import Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.adapters.supabase import SupabaseAdapter
from app.api.deps import get_optional_current_user, get_supabase
from app.core.logging import logger
from app.schemas.auth import CurrentUser
from app.schemas.cart import (
    CartItemCreate,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    CheckoutRequest,
    CheckoutResponse,
)
from app.services.audit import AuditService, audit_service

router = APIRouter(prefix="/cart", tags=["Cart & Checkout"])

# In-memory storage for resilient demo cart management
CARTS: Dict[str, dict] = {}
CART_ITEMS: Dict[str, List[dict]] = {}


def _get_cart_key(user: Optional[CurrentUser], session_id: Optional[str]) -> str:
    if user:
        return f"user_{user.id}"
    if session_id:
        return f"session_{session_id}"
    return "guest_default"


def _ensure_cart(cart_key: str, user: Optional[CurrentUser], session_id: Optional[str]) -> dict:
    if cart_key not in CARTS or CARTS[cart_key].get("status") == "checked_out":
        cart_id = uuid4()
        CARTS[cart_key] = {
            "id": cart_id,
            "user_id": UUID(user.id) if user else None,
            "session_id": session_id or "demo-session-123",
            "status": "active",
            "currency": "INR",
        }
        CART_ITEMS[str(cart_id)] = []
    return CARTS[cart_key]


def _build_cart_response(cart: dict, items: List[dict]) -> CartResponse:
    subtotal = sum(item["quantity"] * item["unit_price"] for item in items)
    total_items = sum(item["quantity"] for item in items)
    return CartResponse(
        id=cart["id"],
        user_id=cart.get("user_id"),
        session_id=cart.get("session_id"),
        status=cart.get("status", "active"),
        currency=cart.get("currency", "INR"),
        items=[
            CartItemResponse(
                id=item["id"],
                cart_id=cart["id"],
                product_id=item["product_id"],
                product_title=item.get("product_title", "Handmade Craft Item"),
                product_image_url=item.get("product_image_url"),
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                total_price=item["quantity"] * item["unit_price"],
                currency="INR",
                customisation=item.get("customisation", {}),
            )
            for item in items
        ],
        subtotal_inr=round(subtotal, 2),
        total_items=total_items,
    )


@router.get("", response_model=CartResponse)
@router.get("/", response_model=CartResponse)
async def get_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    user: Optional[CurrentUser] = Depends(get_optional_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Retrieve current customer shopping cart (authenticated or anonymous guest).
    """
    cart_key = _get_cart_key(user, x_session_id)
    cart = _ensure_cart(cart_key, user, x_session_id)
    items = CART_ITEMS.get(str(cart["id"]), [])
    return _build_cart_response(cart, items)


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
async def add_cart_item(
    item_in: CartItemCreate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    user: Optional[CurrentUser] = Depends(get_optional_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
):
    """
    Add a product to the cart with quantity and optional customisation.
    """
    cart_key = _get_cart_key(user, x_session_id)
    cart = _ensure_cart(cart_key, user, x_session_id)
    items = CART_ITEMS[str(cart["id"])]

    # Fetch product price from database or fallback catalog
    unit_price = 1450.0
    product_title = "Handcrafted Artisan Product"
    product_image = None
    try:
        p_records = await db.query_records("products", {"id": f"eq.{item_in.product_id}"})
        if p_records:
            p = p_records[0]
            unit_price = float(p.get("price", 1450.0))
            product_title = p.get("name") or p.get("title") or product_title
            product_image = p.get("image_url")
    except Exception as e:
        logger.warning("Could not query DB product price: %s", e)

    # Check if product is already in cart
    existing = next((i for i in items if str(i["product_id"]) == str(item_in.product_id)), None)
    if existing:
        existing["quantity"] += item_in.quantity
        if item_in.customisation:
            existing["customisation"] = item_in.customisation
    else:
        new_item = {
            "id": uuid4(),
            "product_id": item_in.product_id,
            "product_title": product_title,
            "product_image_url": product_image,
            "quantity": item_in.quantity,
            "unit_price": unit_price,
            "customisation": item_in.customisation or {},
        }
        items.append(new_item)

    return _build_cart_response(cart, items)


@router.patch("/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: UUID,
    item_in: CartItemUpdate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    user: Optional[CurrentUser] = Depends(get_optional_current_user),
):
    """
    Update quantity of a line item in the cart.
    """
    cart_key = _get_cart_key(user, x_session_id)
    cart = _ensure_cart(cart_key, user, x_session_id)
    items = CART_ITEMS.get(str(cart["id"]), [])

    found = next((i for i in items if str(i["id"]) == str(item_id)), None)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Cart item '{item_id}' not found")

    found["quantity"] = item_in.quantity
    return _build_cart_response(cart, items)


@router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: UUID,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    user: Optional[CurrentUser] = Depends(get_optional_current_user),
):
    """
    Remove an item from the cart.
    """
    cart_key = _get_cart_key(user, x_session_id)
    cart = _ensure_cart(cart_key, user, x_session_id)
    items = CART_ITEMS.get(str(cart["id"]), [])

    new_items = [i for i in items if str(i["id"]) != str(item_id)]
    CART_ITEMS[str(cart["id"])] = new_items

    return _build_cart_response(cart, new_items)


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: CheckoutRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    user: Optional[CurrentUser] = Depends(get_optional_current_user),
    db: SupabaseAdapter = Depends(get_supabase),
    audit: AuditService = Depends(lambda: audit_service),
):
    """
    Simulated checkout endpoint with DEMO payment confirmation.
    Transitions active cart to checked_out, generates an order record, payment log, and order event.
    """
    cart_key = _get_cart_key(user, x_session_id)
    cart = _ensure_cart(cart_key, user, x_session_id)
    items = CART_ITEMS.get(str(cart["id"]), [])

    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot checkout an empty shopping cart. Please add items first.",
        )

    subtotal = sum(i["quantity"] * i["unit_price"] for i in items)
    order_id = uuid4()
    first_product_id = items[0]["product_id"]
    payment_ref = f"demo-pay-upi-{uuid4().hex[:12]}"

    # Persist Order and Events to database
    try:
        order_row = {
            "id": str(order_id),
            "product_id": str(first_product_id),
            "customer_reference": payload.customer_reference,
            "quantity": sum(i["quantity"] for i in items),
            "status": "pending",
        }
        await db.insert_record("orders", order_row)

        payment_row = {
            "order_id": str(order_id),
            "direction": "customer_payment",
            "amount": subtotal,
            "method": payload.payment_method or "upi_qr",
            "status": "recorded",
            "upi_reference": payment_ref,
            "note": "Simulated payment — demo mode",
        }
        await db.insert_record("payments", payment_row)

        event_row = {
            "order_id": str(order_id),
            "event_type": "order_placed",
            "note": f"Order placed via simulated {payload.payment_method} checkout (DEMO)",
        }
        await db.insert_record("order_events", event_row)
    except Exception as e:
        logger.warning("Order persistence warning in demo mode: %s", e)

    # Mark cart as checked out
    cart["status"] = "checked_out"
    CART_ITEMS[str(cart["id"])] = []

    # Audit log
    await audit.log_action(
        user_id=user.id if user else "guest_customer",
        action="cart_checkout_completed",
        entity_type="order",
        entity_id=str(order_id),
        details={
            "customer_reference": payload.customer_reference,
            "amount_inr": subtotal,
            "payment_ref": payment_ref,
            "is_demo": True,
        },
    )

    return CheckoutResponse(
        order_id=order_id,
        order_status="pending",
        amount_inr=round(subtotal, 2),
        payment_status="demo_verified",
        payment_reference=payment_ref,
        payment_method=payload.payment_method,
        is_demo=True,
        customer_reference=payload.customer_reference,
        message="Payment successfully simulated in DEMO mode. Order queued for artisan production.",
    )
