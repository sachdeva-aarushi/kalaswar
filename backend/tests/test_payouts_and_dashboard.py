import uuid
from fastapi.testclient import TestClient


def test_payout_ledger_and_simulated_dbt(
    client: TestClient,
    coordinator_headers: dict,
    financier_headers: dict,
    customer_headers: dict,
):
    """Simulate Direct Benefit Transfer (DBT) wage payout to artisan with immutable ledger entry."""
    artisan_id = str(uuid.uuid4())
    order_id = str(uuid.uuid4())

    dbt_payload = {
        "artisan_id": artisan_id,
        "amount_inr": 1850.0,
        "order_id": order_id,
        "bank_account_last4": "5521",
        "ifsc_code": "PUNB0023400",
        "aadhaar_last4": "9912",
        "note": "Final wage disbursement for Kantha cushion cover batch",
    }

    # Customer role forbidden from executing payouts
    res_cust = client.post("/api/v1/payouts/simulate-dbt", json=dbt_payload, headers=customer_headers)
    assert res_cust.status_code == 403

    # Financier / coordinator role succeeds
    res_dbt = client.post("/api/v1/payouts/simulate-dbt", json=dbt_payload, headers=financier_headers)
    assert res_dbt.status_code == 201
    dbt = res_dbt.json()
    assert dbt["status"] == "completed"
    assert dbt["channel"] == "dbt"
    assert dbt["amount_inr"] == 1850.0
    assert dbt["is_demo"] is True
    assert "DBT-DEMO-PFMS-" in dbt["reference"]

    # Query payout ledger
    res_list = client.get("/api/v1/payouts", headers=coordinator_headers)
    assert res_list.status_code == 200
    payouts = res_list.json()
    assert any(p["reference"] == dbt["reference"] for p in payouts)


def test_craft_stories_crud_and_approval_guard(
    client: TestClient,
    coordinator_headers: dict,
    artisan_headers: dict,
    customer_headers: dict,
):
    """Craft story draft submission, consent tracking, and coordinator approval for publishing."""
    story_payload = {
        "title": "Threads of Resilience: Kantha Stitching in Rural Bengal",
        "body": "Every running stitch carries centuries of oral histories sung by women artisans.",
        "language": "en",
        "source_notes": "Recorded in Santiniketan cooperative.",
        "original_notes": "हम इसे खुशी से बनाते हैं।",
        "ai_assisted": True,
        "consents": [
            {"consent_type": "maker_name", "granted": True},
            {"consent_type": "maker_photo", "granted": True},
            {"consent_type": "voice_transcript", "granted": True},
        ],
    }

    # Create draft
    res_create = client.post("/api/v1/craft-stories", json=story_payload, headers=artisan_headers)
    assert res_create.status_code == 201
    story = res_create.json()
    assert story["status"] == "draft"
    story_id = story["id"]

    # Customer cannot publish story
    res_cust_pub = client.patch(
        f"/api/v1/craft-stories/{story_id}",
        json={"status": "published"},
        headers=customer_headers,
    )
    assert res_cust_pub.status_code == 403

    # Coordinator publishes story
    res_coord_pub = client.patch(
        f"/api/v1/craft-stories/{story_id}",
        json={"status": "published"},
        headers=coordinator_headers,
    )
    assert res_coord_pub.status_code == 200
    assert res_coord_pub.json()["status"] == "published"
    assert res_coord_pub.json()["approved_by"] is not None

    # Public reader sees published story
    res_pub_list = client.get("/api/v1/craft-stories")
    assert res_pub_list.status_code == 200
    pub_ids = [s["id"] for s in res_pub_list.json()]
    assert story_id in pub_ids


def test_notifications_lifecycle(client: TestClient, coordinator_headers: dict):
    """Notification creation, retrieval, and mark read state."""
    notif_payload = {
        "audience": "coordinator",
        "event_type": "order_update",
        "title": "URGENT: Dispatch deadline approaching",
        "body": "Order #22222222-0003 is delayed and needs courier booking.",
    }
    create_res = client.post("/api/v1/notifications", json=notif_payload, headers=coordinator_headers)
    assert create_res.status_code == 201
    notif = create_res.json()
    notif_id = notif["id"]
    assert notif["is_read"] is False

    # Mark as read
    read_res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=coordinator_headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # Summary count
    sum_res = client.get("/api/v1/notifications/summary", headers=coordinator_headers)
    assert sum_res.status_code == 200
    assert "unread_count" in sum_res.json()


def test_coordinator_dashboard_aggregates_and_risk_flags(
    client: TestClient,
    coordinator_headers: dict,
    customer_headers: dict,
):
    """Verify coordinator dashboard counts and automated risk flags with explanatory text."""
    # Customer forbidden from coordinator dashboard
    res_cust = client.get("/api/v1/dashboard/coordinator", headers=customer_headers)
    assert res_cust.status_code == 403

    # Coordinator access
    res = client.get("/api/v1/dashboard/coordinator", headers=coordinator_headers)
    assert res.status_code == 200
    dash = res.json()

    # Verify counts
    counts = dash["counts"]
    assert "active_orders" in counts
    assert "pending_production" in counts
    assert "in_production" in counts
    assert "delayed_orders" in counts
    assert "stale_inventory_items" in counts
    assert "low_stock_materials" in counts
    assert counts["active_orders"] >= 1

    # Verify risk flags have descriptive explanation text
    risk_flags = dash["risk_flags"]
    assert len(risk_flags) >= 1
    for flag in risk_flags:
        assert flag["severity"] in {"high", "medium", "low"}
        assert flag["type"] in {"delayed_orders", "stale_inventory", "low_stock", "missing_qa", "capacity_overload"}
        assert len(flag["title"]) > 5
        assert len(flag["explanation"]) > 20, "Risk flag must contain descriptive explanatory text"
        assert isinstance(flag["affected_ids"], list)

    # Verify recent activity
    assert len(dash["recent_activity"]) >= 1
