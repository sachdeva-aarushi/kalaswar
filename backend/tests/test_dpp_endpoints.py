import uuid
from fastapi.testclient import TestClient


def test_issue_passport_and_privacy_safe_public_view(
    client: TestClient,
    coordinator_headers: dict,
):
    """Issuing a passport generates a canonical leaf hash and privacy-safe public record."""
    product_id = "11111111-0001-0000-0000-000000000001"
    maker_id = "cccccccc-0001-0000-0000-000000000001"

    issue_payload = {
        "product_id": product_id,
        "maker_id": maker_id,
        "product_title": "Heritage Kantha Embroidered Wall Scroll",
        "craft_category": "Kantha Embroidery",
        "maker_display_name": "Radha D.",
        "cluster_name": "Santiniketan Mahila Hastakala Samiti",
        "gps_region": "Bolpur, Birbhum, West Bengal",
        "wage_split_pct": 72.5,
    }

    # Issue passport
    res_issue = client.post("/api/v1/dpp/issue", json=issue_payload, headers=coordinator_headers)
    assert res_issue.status_code == 201
    passport = res_issue.json()
    assert passport["leaf_hash"].startswith("0x")
    token = passport["token"]

    # Public unauthenticated query via /public/passports/{token}
    res_pub = client.get(f"/public/passports/{token}")
    assert res_pub.status_code == 200
    pub = res_pub.json()
    assert pub["token"] == token
    assert pub["product_title"] == issue_payload["product_title"]
    assert pub["maker_display_name"] == "Radha D."
    # Direct PII must not be present
    assert "phone" not in pub
    assert "aadhaar" not in pub
    assert pub["wage_split_pct"] == 72.5


def test_dpp_batch_commit_and_verification_flow(
    client: TestClient,
    coordinator_headers: dict,
):
    """Batch anchoring pending passports to Layer-2 and verifying proof on-chain."""
    # Issue a new passport using second seeded product
    product_id = "11111111-0002-0000-0000-000000000002"
    maker_id = "cccccccc-0001-0000-0000-000000000001"

    res_issue = client.post(
        "/api/v1/dpp/issue",
        json={
            "product_id": product_id,
            "maker_id": maker_id,
            "product_title": "Warli Tribal Canvas Painting",
            "craft_category": "Warli Painting",
            "maker_display_name": "Suresh W.",
            "cluster_name": "Dahanu Warli Tribal Collective",
            "gps_region": "Dahanu, Palghar, Maharashtra",
            "wage_split_pct": 65.0,
        },
        headers=coordinator_headers,
    )
    assert res_issue.status_code == 201
    token = res_issue.json()["token"]

    # Run batch commit
    res_batch = client.post("/api/v1/dpp/batch-commit", json={"batch_size": 100})
    assert res_batch.status_code == 200
    batch = res_batch.json()
    assert batch["status"] == "success"
    assert batch["merkle_root"].startswith("0x")
    assert batch["polygon_tx_hash"].startswith("0x")

    # Cryptographic proof verification
    res_verify = client.get(f"/public/passports/{token}/verify")
    assert res_verify.status_code == 200
    ver = res_verify.json()
    assert ver["verified"] is True
    assert ver["leaf_verified"] is True
    assert ver["merkle_root"].startswith("0x")
    assert ver["polygon_tx_hash"].startswith("0x")
