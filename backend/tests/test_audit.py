from unittest.mock import AsyncMock
from uuid import uuid4
import pytest
from app.services.audit import audit_service


@pytest.fixture(autouse=True)
def mock_audit_adapter(monkeypatch):
    """
    Test double for the Supabase audit data adapter.
    Isolates unit and authorization tests from external network access,
    live Supabase credentials, or database requirements.
    """
    mock_audit_records = [
        {
            "id": "11111111-2222-3333-4444-555555555555",
            "actor": "Platform Admin",
            "action": "system_config_update",
            "entity": "system_settings",
            "entity_id": "config-001",
            "actor_user_id": "00000000-0000-0000-0000-000000000001",
            "payload": {"status": "active"},
            "ip_address": "127.0.0.1",
            "request_id": "req_mock_audit_test",
            "created_at": "2026-10-30T00:00:00Z",
        }
    ]

    mock_query = AsyncMock(return_value=mock_audit_records)
    mock_insert = AsyncMock(side_effect=lambda table, record, **kw: record)

    monkeypatch.setattr(audit_service.adapter, "query_records", mock_query)
    monkeypatch.setattr(audit_service.adapter, "insert_record", mock_insert)

    return {
        "query": mock_query,
        "insert": mock_insert,
        "records": mock_audit_records,
    }


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
    """
    Verify audit log review is restricted strictly to Admins and Coordinators.
    Admins and Coordinators must be authorized to retrieve audit logs,
    unauthorized Customers receive HTTP 403 Forbidden, and anonymous requests receive HTTP 401.
    """
    # 1. Admin is authorized
    res_admin = client.get("/api/v1/audit/logs", headers=admin_headers)
    assert res_admin.status_code == 200
    admin_data = res_admin.json()
    assert "data" in admin_data
    assert admin_data["total"] == 1
    assert len(admin_data["data"]) == 1
    assert admin_data["data"][0]["action"] == "system_config_update"

    # 2. Coordinator is authorized
    res_coord = client.get("/api/v1/audit/logs", headers=coordinator_headers)
    assert res_coord.status_code == 200
    coord_data = res_coord.json()
    assert "data" in coord_data
    assert coord_data["total"] == 1
    assert len(coord_data["data"]) == 1

    # 3. Customer is forbidden
    res_cust = client.get("/api/v1/audit/logs", headers=customer_headers)
    assert res_cust.status_code == 403
    assert res_cust.json()["error"]["code"] == "FORBIDDEN"

    # 4. Unauthenticated is rejected
    res_anon = client.get("/api/v1/audit/logs")
    assert res_anon.status_code == 401
    assert res_anon.json()["error"]["code"] == "UNAUTHORIZED"
