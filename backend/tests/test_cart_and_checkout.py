import uuid
from fastapi.testclient import TestClient


def test_cart_lifecycle_and_checkout_flow(client: TestClient):
    """Full shopping cart lifecycle and checkout with simulated demo payment confirmation."""
    session_id = f"test-sess-{uuid.uuid4().hex[:8]}"
    headers = {"X-Session-Id": session_id}

    # 1. Retrieve initial empty cart
    res_init = client.get("/api/v1/cart", headers=headers)
    assert res_init.status_code == 200
    cart_data = res_init.json()
    assert cart_data["status"] == "active"
    assert cart_data["total_items"] == 0
    assert cart_data["subtotal_inr"] == 0.0

    # 2. Prevent checkout on empty cart
    res_empty_checkout = client.post(
        "/api/v1/cart/checkout",
        json={"customer_reference": "Anita Roy — Bangalore", "payment_method": "upi_qr"},
        headers=headers,
    )
    assert res_empty_checkout.status_code == 400

    # 3. Add first item to cart
    list_prods = client.get("/api/v1/products?page=1&page_size=1")
    prod = list_prods.json()["items"][0]
    prod_id = prod["id"]
    prod_price = prod["price"]

    res_add = client.post(
        "/api/v1/cart/items",
        json={"product_id": prod_id, "quantity": 2, "customisation": {"colour": "Indigo Ochre"}},
        headers=headers,
    )
    assert res_add.status_code == 201
    cart = res_add.json()
    assert cart["total_items"] == 2
    assert cart["subtotal_inr"] == round(prod_price * 2, 2)
    assert len(cart["items"]) == 1
    item_id = cart["items"][0]["id"]

    # 4. Update item quantity
    res_update = client.patch(
        f"/api/v1/cart/items/{item_id}",
        json={"quantity": 3},
        headers=headers,
    )
    assert res_update.status_code == 200
    assert res_update.json()["total_items"] == 3
    assert res_update.json()["subtotal_inr"] == round(prod_price * 3, 2)

    # 5. Execute checkout with simulated payment
    checkout_payload = {
        "customer_reference": "Anita Roy — Bangalore",
        "shipping_name": "Anita Roy",
        "shipping_phone": "+919876543210",
        "shipping_address": "42 Indiranagar 100ft Road, Bangalore 560038",
        "payment_method": "upi_qr",
    }
    res_checkout = client.post("/api/v1/cart/checkout", json=checkout_payload, headers=headers)
    assert res_checkout.status_code == 201
    chk = res_checkout.json()
    assert chk["order_status"] == "pending"
    assert chk["payment_status"] == "demo_verified"
    assert chk["is_demo"] is True
    assert "demo-pay-upi-" in chk["payment_reference"]
    assert chk["amount_inr"] == round(prod_price * 3, 2)
    assert chk["customer_reference"] == checkout_payload["customer_reference"]

    # 6. Verify cart is now checked out / reset
    res_after = client.get("/api/v1/cart", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["total_items"] == 0
