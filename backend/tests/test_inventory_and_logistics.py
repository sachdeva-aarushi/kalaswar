import uuid
from fastapi.testclient import TestClient


def test_materials_inventory_freshness_and_stock_flags(
    client: TestClient,
    coordinator_headers: dict,
):
    """Verify inventory listings flag stale items (>60 days) and low stock."""
    res = client.get("/api/v1/inventory/materials", headers=coordinator_headers)
    assert res.status_code == 200
    materials = res.json()
    assert len(materials) >= 1

    # Check that is_stale and is_low_stock are computed
    has_stale = any(m["is_stale"] for m in materials)
    has_low = any(m["is_low_stock"] for m in materials)
    assert has_stale is True
    assert has_low is True

    # Filter stale only
    stale_res = client.get("/api/v1/inventory/materials?stale_only=true", headers=coordinator_headers)
    assert stale_res.status_code == 200
    for m in stale_res.json():
        assert m["is_stale"] is True


def test_material_crud_and_freshness_reset(
    client: TestClient,
    coordinator_headers: dict,
):
    """Updating a material refreshes its timestamp and clears the stale flag."""
    shg_id = str(uuid.uuid4())
    create_payload = {
        "shg_id": shg_id,
        "name": "Natural Madder Root Powder (Manjistha)",
        "unit": "kg",
        "quantity": 25.0,
        "low_stock_threshold": 5.0,
    }
    res_create = client.post("/api/v1/inventory/materials", json=create_payload, headers=coordinator_headers)
    assert res_create.status_code == 201
    created = res_create.json()
    assert created["name"] == create_payload["name"]
    mat_id = created["id"]

    # Patch updates stock and refreshes timestamp
    res_update = client.patch(
        f"/api/v1/inventory/materials/{mat_id}",
        json={"quantity": 30.0},
        headers=coordinator_headers,
    )
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["quantity"] == 30.0
    assert updated["is_stale"] is False

    # Summary endpoint
    res_sum = client.get("/api/v1/inventory/summary", headers=coordinator_headers)
    assert res_sum.status_code == 200
    assert res_sum.json()["total_materials"] >= 1

    # Delete material
    res_del = client.delete(f"/api/v1/inventory/materials/{mat_id}", headers=coordinator_headers)
    assert res_del.status_code == 200


def test_production_events_and_quality_checks(
    client: TestClient,
    coordinator_headers: dict,
    artisan_headers: dict,
):
    """Test production milestone recording and quality inspection verdict."""
    order_id = str(uuid.uuid4())

    # Record production milestone
    event_payload = {
        "order_id": order_id,
        "stage": "Silk Degumming & Natural Dyeing",
        "note": "Natural lac and turmeric batch dyed",
    }
    res_pe = client.post("/api/v1/production-events", json=event_payload, headers=artisan_headers)
    assert res_pe.status_code == 201
    assert res_pe.json()["stage"] == event_payload["stage"]

    # Query events
    res_list_pe = client.get(f"/api/v1/production-events?order_id={order_id}", headers=coordinator_headers)
    assert res_list_pe.status_code == 200
    assert len(res_list_pe.json()) >= 1

    # Quality check
    qc_payload = {
        "order_id": order_id,
        "result": "pass",
        "notes": "Verified authentic GI thread count and dye fastness",
        "checked_by": "Coordinator Amit",
    }
    res_qc = client.post("/api/v1/quality-checks", json=qc_payload, headers=coordinator_headers)
    assert res_qc.status_code == 201
    qc_data = res_qc.json()
    assert qc_data["result"] == "pass"

    # Query QC
    res_list_qc = client.get(f"/api/v1/quality-checks?order_id={order_id}", headers=coordinator_headers)
    assert res_list_qc.status_code == 200
    assert res_list_qc.json()[0]["result"] == "pass"


def test_shipment_dispatch_and_event_tracking(
    client: TestClient,
    coordinator_headers: dict,
):
    """Create courier shipment and append in-transit milestones after establishing passing QC."""
    order_id = str(uuid.uuid4())

    # Establish required passing Quality Check before dispatch (business rule)
    qc_payload = {
        "order_id": order_id,
        "result": "pass",
        "notes": "Verified authentic craft quality, zero flaws; approved for packaging.",
        "checked_by": "Coordinator Sunita",
    }
    res_qc = client.post("/api/v1/quality-checks", json=qc_payload, headers=coordinator_headers)
    assert res_qc.status_code == 201
    assert res_qc.json()["result"] == "pass"

    shipment_payload = {
        "order_id": order_id,
        "carrier": "BlueDart Express",
        "tracking_ref": "BD-TEST-778899",
        "provider": "BlueDart Surface",
        "status": "preparing",
    }
    res_ship = client.post("/api/v1/shipments", json=shipment_payload, headers=coordinator_headers)
    assert res_ship.status_code == 201
    shipment = res_ship.json()
    shipment_id = shipment["id"]
    assert shipment["tracking_ref"] == shipment_payload["tracking_ref"]

    # Append tracking event
    res_evt = client.post(
        f"/api/v1/shipments/{shipment_id}/events",
        json={"event_type": "in_transit", "note": "Arrived at Kolkata Sorting Facility"},
        headers=coordinator_headers,
    )
    assert res_evt.status_code == 201
    assert res_evt.json()["event_type"] == "in_transit"

    # Verify shipment query
    res_list = client.get(f"/api/v1/shipments?order_id={order_id}", headers=coordinator_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1
    assert res_list.json()[0]["status"] == "in_transit"


def test_shipment_dispatch_gated_without_passing_qc(
    client: TestClient,
    coordinator_headers: dict,
):
    """Verify that courier dispatch is strictly rejected (HTTP 400) if order has no passing QC."""
    uninspected_order_id = str(uuid.uuid4())
    shipment_payload = {
        "order_id": uninspected_order_id,
        "carrier": "Delhivery Surface",
        "tracking_ref": "DL-UNINSPECTED-001",
        "provider": "Delhivery",
        "status": "preparing",
    }

    # Case 1: No QC record exists for the order
    res_uninspected = client.post("/api/v1/shipments", json=shipment_payload, headers=coordinator_headers)
    assert res_uninspected.status_code == 400
    assert "Dispatch Gated" in res_uninspected.json()["error"]["message"]

    # Case 2: Order has a failing QC record
    failed_qc_order_id = str(uuid.uuid4())
    qc_fail_payload = {
        "order_id": failed_qc_order_id,
        "result": "fail",
        "notes": "Thread tension mismatch; failed QC inspection.",
        "checked_by": "Coordinator Sunita",
    }
    res_qc_fail = client.post("/api/v1/quality-checks", json=qc_fail_payload, headers=coordinator_headers)
    assert res_qc_fail.status_code == 201
    assert res_qc_fail.json()["result"] == "fail"

    fail_shipment_payload = {
        "order_id": failed_qc_order_id,
        "carrier": "Delhivery Surface",
        "tracking_ref": "DL-FAILEDQC-002",
        "provider": "Delhivery",
        "status": "preparing",
    }
    res_fail_ship = client.post("/api/v1/shipments", json=fail_shipment_payload, headers=coordinator_headers)
    assert res_fail_ship.status_code == 400
    assert "Dispatch Gated" in res_fail_ship.json()["error"]["message"]
