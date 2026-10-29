import pytest
from uuid import uuid4
from app.services.audit import audit_service


@pytest.mark.asyncio
async def test_audit_service_log_action_unit():
    """Verify AuditService directly formats and writes action logs."""
    test_user_id = uuid4()
    test_entity_id = uuid4()
    entry = await audit_service.log_action(
        actor="Test Admin",
        action="update_status",
        entity="orders",
        entity_id=test_entity_id,
        actor_user_id=test_user_id,
        payload={"previous": "pending", "new": "shipped"},
        ip_address="127.0.0.1",
        request_id="req_test_audit_unit",
    )

    assert entry["actor"] == "Test Admin"
    assert entry["action"] == "update_status"
    assert entry["entity"] == "orders"
    assert entry["entity_id"] == str(test_entity_id)
    assert entry["actor_user_id"] == str(test_user_id)
    assert entry["request_id"] == "req_test_audit_unit"
    assert entry["payload"]["new"] == "shipped"


def test_audit_log_endpoint_create(client, artisan_headers):
    """Verify authenticated artisan can log an action via POST /audit/logs."""
    payload = {
        "action": "craft_sample_submitted",
        "entity": "sample_requests",
        "payload": {"notes": "Hand-stitched sample dispatched for review"},
    }
    response = client.post("/api/v1/audit/logs", headers=artisan_headers, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "recorded"
    assert "entry" in data
    assert data["entry"]["action"] == "craft_sample_submitted"
    assert data["entry"]["entity"] == "sample_requests"


def test_audit_logs_read_restricted_to_admin_or_coordinator(
    client, admin_headers, coordinator_headers, customer_headers
):
    """Verify audit log review is restricted strictly to Admins and Coordinators."""
    # Admin is authorized
    res_admin = client.get("/api/v1/audit/logs", headers=admin_headers)
    assert res_admin.status_code == 200
    assert "data" in res_admin.json()

    # Coordinator is authorized
    res_coord = client.get("/api/v1/audit/logs", headers=coordinator_headers)
    assert res_coord.status_code == 200
    assert "data" in res_coord.json()

    # Customer is forbidden
    res_cust = client.get("/api/v1/audit/logs", headers=customer_headers)
    assert res_cust.status_code == 403
    assert res_cust.json()["error"]["code"] == "FORBIDDEN"

    # Unauthenticated is rejected
    res_anon = client.get("/api/v1/audit/logs")
    assert res_anon.status_code == 401
    assert res_anon.json()["error"]["code"] == "UNAUTHORIZED"
