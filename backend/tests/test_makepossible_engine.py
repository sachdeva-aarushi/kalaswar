from datetime import datetime, timedelta, timezone
from app.schemas.makepossible import (
    CollectiveSnapshot,
    ComparablePriceStats,
    CustomRequestSpec,
    MakePossibleEvaluationRequest,
    MaterialRecord,
    SkillRecord,
)
from app.services.makepossible import evaluate_feasibility


def build_test_snapshot(
    skills=None,
    materials=None,
    monthly_capacity=100,
    active_workload=20,
    mat_age_days=10,
):
    now = datetime.now(timezone.utc)
    if skills is None:
        skills = [
            SkillRecord(skill="Kantha hand embroidery", level="expert"),
            SkillRecord(skill="Silk stitching", level="core"),
        ]
    if materials is None:
        materials = [
            MaterialRecord(
                name="Tussar silk fabric",
                unit="meters",
                quantity=120.0,
                low_stock_threshold=15.0,
                updated_at=now - timedelta(days=mat_age_days),
            )
        ]

    return CollectiveSnapshot(
        shg_id="bbbbbbbb-0001-0000-0000-000000000001",
        shg_name="Bolpur Shantiniketan Mahila Samiti",
        monthly_capacity=monthly_capacity,
        skills=skills,
        materials=materials,
        active_workload_units=active_workload,
        comparable_prices=ComparablePriceStats(min=800.0, avg=1250.0, max=1800.0, count=12),
    )


def test_makepossible_fully_feasible_scenario():
    """Verify clean feasible evaluation when skills match, materials are fresh, and schedule fits."""
    snap = build_test_snapshot(monthly_capacity=120, active_workload=20, mat_age_days=5)
    spec = CustomRequestSpec(
        quantity=30,
        craft_preference="Kantha embroidery",
        materials="Tussar silk fabric",
        deadline_in_days=25,
        budget_inr_per_unit=1200.0,
    )

    req = MakePossibleEvaluationRequest(request=spec, snapshot=snap)
    res = evaluate_feasibility(req)

    assert res.status == "feasible"
    assert len(res.evidence) >= 3
    assert len(res.missing_info) == 0
    assert len(res.constraints) == 0
    assert "Feasible" in res.summary


def test_makepossible_uncertain_on_missing_skills():
    """Golden Rule: If skills are unrecorded, status is 'uncertain', NEVER 'feasible'."""
    snap = build_test_snapshot(skills=[])  # No skills recorded
    spec = CustomRequestSpec(
        quantity=20,
        craft_preference="Kantha embroidery",
        materials="Tussar silk fabric",
        deadline_in_days=30,
    )

    res = evaluate_feasibility(MakePossibleEvaluationRequest(request=spec, snapshot=snap))
    assert res.status == "uncertain"
    assert any("skills are recorded" in m for m in res.missing_info)


def test_makepossible_uncertain_on_stale_inventory():
    """Golden Rule: Inventory exceeding freshness policy must be marked 'uncertain'."""
    # Stale material: updated 85 days ago, threshold 60 days
    snap = build_test_snapshot(mat_age_days=85)
    spec = CustomRequestSpec(
        quantity=20,
        craft_preference="Kantha embroidery",
        materials="Tussar silk fabric",
        deadline_in_days=30,
    )

    req = MakePossibleEvaluationRequest(
        request=spec,
        snapshot=snap,
        inventory_freshness_threshold_days=60,
    )
    res = evaluate_feasibility(req)

    assert res.status == "uncertain"
    assert any("freshness policy" in m for m in res.missing_info)


def test_makepossible_uncertain_on_unrecorded_capacity():
    """Golden Rule: Unrecorded monthly capacity must evaluate to 'uncertain'."""
    snap = build_test_snapshot(monthly_capacity=None)  # Unknown capacity
    spec = CustomRequestSpec(
        quantity=20,
        craft_preference="Kantha embroidery",
        materials="Tussar silk fabric",
        deadline_in_days=30,
    )

    res = evaluate_feasibility(MakePossibleEvaluationRequest(request=spec, snapshot=snap))
    assert res.status == "uncertain"
    assert any("Monthly production capacity is unrecorded" in m for m in res.missing_info)


def test_makepossible_hard_failure_craft_mismatch():
    """Hard failure: Requesting a craft skill absent from the collective yields 'not_feasible'."""
    snap = build_test_snapshot(
        skills=[SkillRecord(skill="Kantha embroidery", level="expert")]
    )
    spec = CustomRequestSpec(
        quantity=20,
        craft_preference="Warli tribal canvas painting",  # Incompatible craft!
        materials="Canvas and pigment",
        deadline_in_days=30,
    )

    res = evaluate_feasibility(MakePossibleEvaluationRequest(request=spec, snapshot=snap))
    assert res.status == "not_feasible"
    assert any("does not possess recorded skills" in c for c in res.constraints)


def test_makepossible_hard_failure_impossible_capacity_and_deadline():
    """Hard failure: Quantity far exceeding monthly capacity yields 'not_feasible'."""
    # Collective capacity is only 40 pieces/month, request is for 200 pieces
    snap = build_test_snapshot(monthly_capacity=40, active_workload=10)
    spec = CustomRequestSpec(
        quantity=200,
        craft_preference="Kantha embroidery",
        materials="Tussar silk fabric",
        deadline_in_days=10,  # 10-day deadline on 200 pieces
    )

    res = evaluate_feasibility(MakePossibleEvaluationRequest(request=spec, snapshot=snap))
    assert res.status == "not_feasible"
    assert len(res.constraints) > 0


def test_makepossible_api_endpoint(client):
    """Verify POST /api/v1/makepossible/evaluate returns structured result."""
    payload = {
        "request": {
            "quantity": 25,
            "craft_preference": "Kantha embroidery",
            "materials": "Tussar silk fabric",
            "deadline_in_days": 20,
            "budget_inr_per_unit": 1100.0,
        },
        "snapshot": {
            "shg_id": "bbbbbbbb-0001-0000-0000-000000000001",
            "shg_name": "Bolpur Shantiniketan Mahila Samiti",
            "monthly_capacity": 100,
            "skills": [{"skill": "Kantha embroidery", "level": "expert"}],
            "materials": [
                {
                    "name": "Tussar silk fabric",
                    "unit": "meters",
                    "quantity": 80.0,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "active_workload_units": 15,
            "comparable_prices": {"min": 850.0, "avg": 1200.0, "max": 1600.0, "count": 8},
        },
    }

    response = client.post("/api/v1/makepossible/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "feasible"
    assert "evidence" in data
    assert "summary" in data
