import uuid
from fastapi.testclient import TestClient


def test_orders_query_and_detail(client: TestClient, coordinator_headers: dict):
    """List orders with filters and retrieve single order detail."""
    res = client.get("/api/v1/orders", headers=coordinator_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1

    first_order = data["items"][0]
    order_id = first_order["id"]

    # Detail query
    res_detail = client.get(f"/api/v1/orders/{order_id}", headers=coordinator_headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == order_id
    assert "events" in detail
    assert "assignments" in detail


def test_order_status_transitions_and_guards(
    client: TestClient,
    coordinator_headers: dict,
    customer_headers: dict,
):
    """Transition order status through lifecycle stages with coordinator guard."""
    # Create an order
    order_id_payload = {
        "product_id": str(uuid.uuid4()),
        "customer_reference": "Rohit Verma — Pune",
        "quantity": 3,
        "expected_dispatch_at": "2026-11-15",
    }
    create_res = client.post("/api/v1/orders", json=order_id_payload, headers=coordinator_headers)
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    # Customer forbidden from updating order status
    res_cust = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "in_production"},
        headers=customer_headers,
    )
    assert res_cust.status_code == 403

    # Coordinator transitions: pending -> in_production
    res_in_prod = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "in_production", "note": "Artisan commenced fabric cutting"},
        headers=coordinator_headers,
    )
    assert res_in_prod.status_code == 200
    assert res_in_prod.json()["status"] == "in_production"

    # Transition to ready_for_dispatch
    res_ready = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "ready_for_dispatch", "note": "GI tag attached and QA passed"},
        headers=coordinator_headers,
    )
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready_for_dispatch"

    # Verify event logged
    detail_res = client.get(f"/api/v1/orders/{order_id}", headers=coordinator_headers)
    event_notes = [e["note"] for e in detail_res.json()["events"]]
    assert any("Artisan commenced fabric cutting" in n for n in event_notes if n)


def test_artisan_assignment_lifecycle(client: TestClient, coordinator_headers: dict):
    """Assign artisan to an order and verify assignment status and deletion."""
    list_orders = client.get("/api/v1/orders", headers=coordinator_headers)
    order_id = list_orders.json()["items"][0]["id"]
    artisan_id = str(uuid.uuid4())

    # Create assignment
    assign_payload = {
        "order_id": order_id,
        "artisan_id": artisan_id,
        "assigned_by": "Coordinator Amit",
    }
    res_assign = client.post("/api/v1/assignments", json=assign_payload, headers=coordinator_headers)
    assert res_assign.status_code == 201
    assignment = res_assign.json()
    assert assignment["order_id"] == order_id
    assert assignment["artisan_id"] == artisan_id
    assignment_id = assignment["id"]

    # Verify order reflects the assignment
    order_detail = client.get(f"/api/v1/orders/{order_id}", headers=coordinator_headers).json()
    assigned_ids = [str(a["artisan_id"]) for a in order_detail["assignments"]]
    assert artisan_id in assigned_ids

    # Delete assignment
    del_res = client.delete(f"/api/v1/assignments/{assignment_id}", headers=coordinator_headers)
    assert del_res.status_code == 200
