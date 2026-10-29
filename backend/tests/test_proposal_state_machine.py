from uuid import uuid4
import pytest


def test_proposal_lifecycle_and_two_sided_approval_flow(client, coordinator_headers, buyer_headers):
    """
    Test Proposal & Quote Versioning State Machine:
    1. Create draft proposal at version 1
    2. Submit proposal (locks version)
    3. Revise proposal (material change spawns version 2; version 1 marked superseded)
    4. Guard check: Approving superseded version 1 is strictly rejected (409 Conflict)
    5. Two-sided approval on exact same version 2 confirms order
    6. Sample request flow tracks physical prototype production & delivery
    """
    # 1. Create Proposal (Draft Version 1)
    create_payload = {
        "title": "Corporate Annual Gala Handloom Silk Stoles",
        "spec": {
            "title": "Mulberry Silk Stole with Zari Border",
            "craft": "Handloom Silk Weaving",
            "quantity": 100,
            "unit_price_inr": 1500.0,
            "total_price_inr": 150000.0,
            "timeline_days": 30,
            "materials_summary": "Pure Mulberry Silk, Gold Zari thread",
            "delivery_terms": "Doorstep insured delivery",
            "cancellation_terms": "Standard cancellation prior to loom warping",
        },
        "created_by": "Coordinator Anita Sharma",
    }
    res_create = client.post("/api/v1/proposals", headers=coordinator_headers, json=create_payload)
    assert res_create.status_code == 200
    p1 = res_create.json()
    proposal_id = p1["id"]

    assert p1["current_version"] == 1
    assert p1["status"] == "draft"
    assert len(p1["versions"]) == 1
    assert p1["versions"][0]["version"] == 1

    # 2. Submit Proposal
    res_submit = client.post(f"/api/v1/proposals/{proposal_id}/submit", headers=coordinator_headers)
    assert res_submit.status_code == 200
    p2 = res_submit.json()
    assert p2["status"] == "submitted"
    assert p2["versions"][0]["status"] == "submitted"
    assert p2["versions"][0]["is_immutable"] is True

    # 3. Material Change: Revise Proposal (Quantity increases from 100 to 125)
    revise_payload = {
        "reason_for_revision": "Buyer requested +25 stoles and express delivery",
        "new_spec": {
            "title": "Mulberry Silk Stole with Zari Border",
            "craft": "Handloom Silk Weaving",
            "quantity": 125,
            "unit_price_inr": 1450.0,
            "total_price_inr": 181250.0,
            "timeline_days": 28,
            "materials_summary": "Pure Mulberry Silk, Gold Zari thread",
            "delivery_terms": "Express insured courier delivery",
            "cancellation_terms": "Standard cancellation terms",
        },
        "revised_by": "Coordinator Anita Sharma",
    }
    res_revise = client.post(f"/api/v1/proposals/{proposal_id}/revise", headers=coordinator_headers, json=revise_payload)
    assert res_revise.status_code == 200
    p3 = res_revise.json()

    assert p3["current_version"] == 2
    assert p3["status"] == "revised"
    assert len(p3["versions"]) == 2
    # Prior version 1 must be superseded and immutable
    v1 = next(v for v in p3["versions"] if v["version"] == 1)
    assert v1["status"] == "superseded"
    assert v1["is_immutable"] is True
    # New version 2 active
    v2 = next(v for v in p3["versions"] if v["version"] == 2)
    assert v2["version"] == 2
    assert v2["spec"]["quantity"] == 125

    # 4. Transition Guard Check: Attempting to approve superseded version 1 must be REJECTED!
    bad_approve_payload = {
        "version": 1,  # Outdated version!
        "approver_role": "buyer",
        "approver_name": "Buyer Rajesh Mehta",
        "notes": "Approving old version 1 by mistake",
    }
    res_bad_app = client.post(f"/api/v1/proposals/{proposal_id}/approve", headers=buyer_headers, json=bad_approve_payload)
    assert res_bad_app.status_code == 409
    assert res_bad_app.json()["error"]["code"] == "CONFLICT"
    assert "superseded version" in res_bad_app.json()["error"]["message"]

    # 5. Two-Sided Approval on Version 2
    # Step A: Coordinator approves Version 2
    coord_app_payload = {
        "version": 2,
        "approver_role": "coordinator",
        "approver_name": "Coordinator Anita Sharma",
        "notes": "Verified silk loom capacity for 125 stoles",
    }
    res_coord_app = client.post(f"/api/v1/proposals/{proposal_id}/approve", headers=coordinator_headers, json=coord_app_payload)
    assert res_coord_app.status_code == 200
    p4 = res_coord_app.json()
    assert p4["status"] == "approved_by_coordinator"
    assert p4["both_parties_approved"] is False

    # Step B: Buyer approves Version 2 (Same version!) -> ORDER CONFIRMED!
    buyer_app_payload = {
        "version": 2,
        "approver_role": "buyer",
        "approver_name": "Buyer Rajesh Mehta",
        "notes": "PO-2026-99 approved on corporate portal",
    }
    res_buyer_app = client.post(f"/api/v1/proposals/{proposal_id}/approve", headers=buyer_headers, json=buyer_app_payload)
    assert res_buyer_app.status_code == 200
    p5 = res_buyer_app.json()

    assert p5["status"] == "confirmed"
    assert p5["both_parties_approved"] is True
    assert p5["confirmed_order_id"] is not None
    v2_final = next(v for v in p5["versions"] if v["version"] == 2)
    assert v2_final["status"] == "confirmed"
    assert v2_final["is_immutable"] is True
    assert v2_final["coordinator_approval"]["approver_name"] == "Coordinator Anita Sharma"
    assert v2_final["buyer_approval"]["approver_name"] == "Buyer Rajesh Mehta"

    # 6. Sample Request Flow
    sample_payload = {
        "spec_version": 2,
        "fee_inr": 1800.0,
        "notes": "One sample piece with finished zari border for corporate board review",
    }
    res_sample = client.post(f"/api/v1/proposals/{proposal_id}/samples", headers=buyer_headers, json=sample_payload)
    assert res_sample.status_code == 200
    s1 = res_sample.json()
    sample_id = s1["id"]
    assert s1["spec_version"] == 2
    assert s1["status"] == "requested"

    # Advance sample status to dispatched
    status_update = {
        "new_status": "dispatched",
        "tracking_number": "IN-POST-998877",
        "feedback": "Dispatched via express post",
    }
    res_status = client.patch(
        f"/api/v1/proposals/{proposal_id}/samples/{sample_id}",
        headers=coordinator_headers,
        json=status_update,
    )
    assert res_status.status_code == 200
    s2 = res_status.json()
    assert s2["status"] == "dispatched"
    assert s2["tracking_number"] == "IN-POST-998877"

    # Verify GET proposal includes sample
    res_get = client.get(f"/api/v1/proposals/{proposal_id}")
    assert res_get.status_code == 200
    p_get = res_get.json()
    assert len(p_get["samples"]) == 1
    assert p_get["samples"][0]["status"] == "dispatched"
