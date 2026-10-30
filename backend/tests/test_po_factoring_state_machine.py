import uuid
from fastapi.testclient import TestClient


def test_po_factoring_sequential_state_machine_happy_path(
    client: TestClient,
    coordinator_headers: dict,
    buyer_headers: dict,
):
    """
    Test full happy path:
    po_created -> tokenized -> advance_disbursed(70%) -> delivered -> escrow_released(30%)
    """
    po_amount = 100000.0  # ₹1,00,000

    create_payload = {
        "po_reference": f"PO-TEST-{uuid.uuid4().hex[:6].upper()}",
        "po_amount_inr": po_amount,
        "buyer_name": "FabIndia Sourcing",
        "shg_name": "Santiniketan Mahila Hastakala Samiti",
        "advance_percent": 70.0,
        "notes": "Festive batch order 100 cushion covers",
    }

    # Step 1: Create PO factoring request (status='po_created')
    res_create = client.post("/api/v1/factoring/po", json=create_payload, headers=coordinator_headers)
    assert res_create.status_code == 201
    factoring = res_create.json()
    assert factoring["status"] == "po_created"
    assert factoring["advance_amount_inr"] == 70000.0  # 70%
    assert factoring["escrow_amount_inr"] == 30000.0   # 30%
    assert factoring["is_simulated"] is True
    factoring_id = factoring["id"]

    # Step 2: Transition po_created -> tokenized
    res_tok = client.post(f"/api/v1/factoring/po/{factoring_id}/tokenize", headers=coordinator_headers)
    assert res_tok.status_code == 200
    tok = res_tok.json()
    assert tok["status"] == "tokenized"
    assert len(tok["ledger"]) == 2
    assert tok["ledger"][1]["step"] == "tokenized"
    assert tok["ledger"][1]["is_simulated"] is True

    # Step 3: Transition tokenized -> advance_disbursed (70%)
    res_adv = client.post(f"/api/v1/factoring/po/{factoring_id}/disburse-advance", headers=coordinator_headers)
    assert res_adv.status_code == 200
    adv = res_adv.json()
    assert adv["status"] == "advance_disbursed"
    assert adv["ledger"][-1]["amount_inr"] == 70000.0
    assert adv["ledger"][-1]["is_simulated"] is True

    # Step 4: Transition advance_disbursed -> delivered
    res_del = client.post(f"/api/v1/factoring/po/{factoring_id}/deliver", headers=buyer_headers)
    assert res_del.status_code == 200
    delivered = res_del.json()
    assert delivered["status"] == "delivered"
    assert delivered["ledger"][-1]["step"] == "delivered"

    # Step 5: Transition delivered -> escrow_released (30%)
    res_esc = client.post(f"/api/v1/factoring/po/{factoring_id}/release-escrow", headers=coordinator_headers)
    assert res_esc.status_code == 200
    settled = res_esc.json()
    assert settled["status"] == "escrow_released"
    assert settled["ledger"][-1]["amount_inr"] == 30000.0
    assert settled["ledger"][-1]["direction"] == "escrow_release_to_shg"
    assert settled["is_simulated"] is True

    # Detail query verifies complete simulated ledger trail
    res_get = client.get(f"/api/v1/factoring/po/{factoring_id}", headers=coordinator_headers)
    assert res_get.status_code == 200
    assert len(res_get.json()["ledger"]) == 5


def test_po_factoring_illegal_transition_guards(
    client: TestClient,
    coordinator_headers: dict,
):
    """Verify state machine transition guards reject out-of-order jumps with 409 Conflict."""
    create_payload = {
        "po_reference": f"PO-GUARD-TEST-{uuid.uuid4().hex[:6].upper()}",
        "po_amount_inr": 50000.0,
        "buyer_name": "Retail Buyer",
        "shg_name": "Warli Collective",
        "advance_percent": 70.0,
    }

    res_create = client.post("/api/v1/factoring/po", json=create_payload, headers=coordinator_headers)
    factoring_id = res_create.json()["id"]

    # Attempting to disburse advance while still in 'po_created' must fail (409)
    res_bad_adv = client.post(f"/api/v1/factoring/po/{factoring_id}/disburse-advance", headers=coordinator_headers)
    assert res_bad_adv.status_code == 409
    data_adv = res_bad_adv.json()
    msg_adv = data_adv.get("error", {}).get("message") or data_adv.get("detail", "")
    assert "Illegal transition" in msg_adv

    # Attempting to release escrow while still in 'po_created' must fail (409)
    res_bad_esc = client.post(f"/api/v1/factoring/po/{factoring_id}/release-escrow", headers=coordinator_headers)
    assert res_bad_esc.status_code == 409
    data_esc = res_bad_esc.json()
    msg_esc = data_esc.get("error", {}).get("message") or data_esc.get("detail", "")
    assert "Illegal transition" in msg_esc
