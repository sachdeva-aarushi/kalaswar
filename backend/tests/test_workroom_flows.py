import pytest
from uuid import UUID


def test_listing_validation_queue_and_gating(client, coordinator_headers, artisan_headers):
    # 1. Artisan CANNOT access validation queue -> 403 Forbidden
    res_art = client.get("/api/v1/products/validation-queue", headers=artisan_headers)
    assert res_art.status_code == 403

    # 2. Coordinator can access validation queue -> 200 OK
    res = client.get("/api/v1/products/validation-queue", headers=coordinator_headers)
    assert res.status_code == 200
    queue = res.json()
    assert isinstance(queue, list)
    assert len(queue) >= 1

    # Find or create a pending item
    pending_item = next((p for p in queue if p["status"] == "pending_validation"), None)
    if not pending_item:
        create_res = client.post("/api/v1/products", headers=artisan_headers, json={
            "artisan_id": "cccccccc-0001-0000-0000-000000000001",
            "title": "Test Sikki Basket for Queue",
            "category": "Natural Fiber Crafts",
            "price": 890.0,
            "availability": True
        })
        assert create_res.status_code == 201
        pending_item = create_res.json()

    pid = pending_item["id"]

    # 3. Artisan CANNOT validate listings -> 403 Forbidden
    res_art_val = client.post(f"/api/v1/products/{pid}/validate", headers=artisan_headers, json={"action": "approve"})
    assert res_art_val.status_code == 403

    # 4. Cannot publish unapproved product (Publication Gating)
    pub_res = client.post(f"/api/v1/products/{pid}/publish", headers=coordinator_headers)
    assert pub_res.status_code == 400
    assert "Publication Gated" in str(pub_res.json()) or "approved" in str(pub_res.json())

    # 5. Rejection requires reason
    rej_fail = client.post(f"/api/v1/products/{pid}/validate", headers=coordinator_headers, json={"action": "reject"})
    assert rej_fail.status_code == 400

    # 6. Reject with reason
    rej_res = client.post(f"/api/v1/products/{pid}/validate", headers=coordinator_headers, json={
        "action": "reject",
        "reason": "GI motif non-compliant with collective standards"
    })
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"
    assert rej_res.json()["rejection_reason"] == "GI motif non-compliant with collective standards"

    # 7. Approve product (Admin or Coordinator)
    app_res = client.post(f"/api/v1/products/{pid}/validate", headers=coordinator_headers, json={"action": "approve"})
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"

    # 8. Publish approved product
    pub_ok = client.post(f"/api/v1/products/{pid}/publish", headers=coordinator_headers)
    assert pub_ok.status_code == 200
    assert pub_ok.json()["status"] == "published"


def test_skills_aware_assignment_suggestions(client, coordinator_headers, artisan_headers):
    # Artisan CANNOT view assignment suggestions or assign orders -> 403 Forbidden
    art_res = client.get("/api/v1/assignments/suggestions?order_id=22222222-0001-0000-0000-000000000001", headers=artisan_headers)
    assert art_res.status_code == 403

    # Coordinator can query suggestions
    res = client.get("/api/v1/assignments/suggestions?order_id=22222222-0001-0000-0000-000000000001", headers=coordinator_headers)
    assert res.status_code == 200
    suggestions = res.json()
    assert len(suggestions) > 0

    top = suggestions[0]
    assert top["recommended"] is True
    assert top["match_score"] >= 80
    assert len(top["reasons"]) > 0
    assert "Kantha" in " ".join(top["craft_skills"])


def test_inventory_freshness_verification(client, coordinator_headers, artisan_headers):
    # List materials
    res = client.get("/api/v1/inventory/materials", headers=coordinator_headers)
    assert res.status_code == 200
    materials = res.json()
    stale_mat = next((m for m in materials if m["is_stale"]), materials[0])
    mat_id = stale_mat["id"]

    # Artisan CANNOT verify/update inventory -> 403 Forbidden
    art_ver = client.post(f"/api/v1/inventory/materials/{mat_id}/verify", headers=artisan_headers)
    assert art_ver.status_code == 403

    # Coordinator can verify freshness
    verify_res = client.post(f"/api/v1/inventory/materials/{mat_id}/verify", headers=coordinator_headers)
    assert verify_res.status_code == 200
    updated = verify_res.json()
    assert updated["is_stale"] is False
    assert updated["age_in_days"] == 0


def test_dispatch_gating_on_quality_check(client, coordinator_headers, artisan_headers):
    # Order without passing QC should fail shipment dispatch
    uninspected_order_id = "22222222-0002-0000-0000-000000000002"

    # Artisan CANNOT create shipment -> 403 Forbidden
    art_ship = client.post("/api/v1/shipments", headers=artisan_headers, json={
        "order_id": uninspected_order_id,
        "carrier": "BlueDart Express",
        "tracking_ref": "BD-TEST-001",
        "provider": "BlueDart"
    })
    assert art_ship.status_code == 403

    # Coordinator creating shipment for uninspected order -> 400 Bad Request (Gated)
    ship_res = client.post("/api/v1/shipments", headers=coordinator_headers, json={
        "order_id": uninspected_order_id,
        "carrier": "BlueDart Express",
        "tracking_ref": "BD-TEST-001",
        "provider": "BlueDart"
    })
    assert ship_res.status_code == 400
    assert "Dispatch Gated" in str(ship_res.json())

    # Record passing QC
    qc_res = client.post("/api/v1/quality-checks", headers=coordinator_headers, json={
        "order_id": uninspected_order_id,
        "result": "pass",
        "notes": "Motif tension and thread alignment verified."
    })
    assert qc_res.status_code == 201

    # Now shipment dispatch should succeed!
    ship_ok = client.post("/api/v1/shipments", headers=coordinator_headers, json={
        "order_id": uninspected_order_id,
        "carrier": "BlueDart Express",
        "tracking_ref": "BD-TEST-002",
        "provider": "BlueDart"
    })
    assert ship_ok.status_code == 201
    assert ship_ok.json()["status"] == "preparing"


def test_proposal_decline_and_version_history(client, coordinator_headers):
    proposal_id = "66666666-0001-0000-0000-000000000001"

    detail_res = client.get(f"/api/v1/proposals/{proposal_id}", headers=coordinator_headers)
    assert detail_res.status_code == 200
    p = detail_res.json()
    assert "versions" in p
    assert len(p["versions"]) >= 1

    # Decline
    dec_res = client.post(f"/api/v1/proposals/{proposal_id}/decline", headers=coordinator_headers, json={
        "version": p["current_version"],
        "reason": "Commercial terms need re-negotiation with corporate procurement"
    })
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "declined"


def test_no_admin_or_demo_role_switching(client, coordinator_headers, artisan_headers):
    # Admin routes and demo role switching have been eliminated
    assert client.get('/api/v1/auth/users', headers=coordinator_headers).status_code in (404, 405)
    assert client.get('/api/v1/auth/settings/demo-mode').status_code in (404, 405)
    assert client.post('/api/v1/auth/settings/demo-mode', headers=coordinator_headers, json={'enabled': True}).status_code in (404, 405)
