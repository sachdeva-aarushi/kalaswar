from datetime import datetime, timedelta, timezone
from app.schemas.pricing import (
    FairPriceCalculateRequest,
    LabourStageCostLine,
    MaterialCostLine,
)
from app.services.fairprice import compute_fair_price


def test_fairprice_materials_wastage_and_labour():
    """Verify material cost with wastage allowance and labour cost calculation."""
    now = datetime.now(timezone.utc)
    req = FairPriceCalculateRequest(
        materials=[
            MaterialCostLine(
                name="Tussar Silk",
                quantity=3.0,
                unit="meters",
                unit_cost_inr=400.0,
                wastage_percent=10.0,  # 10% wastage
                price_confirmed_at=now,
            ),
            MaterialCostLine(
                name="Zari Thread",
                quantity=2.0,
                unit="spools",
                unit_cost_inr=150.0,
                wastage_percent=0.0,
                price_confirmed_at=now,
            ),
        ],
        labour_stages=[
            LabourStageCostLine(
                stage_name="Weaving & Finishing",
                hours=8.0,
                hourly_rate_inr=150.0,
                rate_source="Living wage",
            )
        ],
        packaging_inr=50.0,
        overhead_percent=10.0,
        commission_percent=7.0,
        target_margin_percent=25.0,
    )

    res = compute_fair_price(req)

    # Raw materials = (3 * 400) + (2 * 150) = 1200 + 300 = 1500
    assert res.materials_cost == 1500.0
    # Wastage on Tussar Silk = 10% of 1200 = 120
    assert res.wastage_cost == 120.0
    assert res.direct_materials_total == 1620.0

    # Labour = 8 * 150 = 1200
    assert res.labour_cost == 1200.0
    assert res.packaging_cost == 50.0

    # Direct production cost = 1620 + 1200 + 50 = 2870
    assert res.direct_production_cost == 2870.0

    # Overhead = 10% on (direct materials 1620 + labour 1200) = 10% of 2820 = 282.0
    assert res.overhead_cost == 282.0

    # Total production cost = 2870 + 282 = 3152.0
    assert res.total_production_cost == 3152.0
    assert res.floor_price == 3152.0
    assert res.is_valid is True


def test_markup_vs_margin_distinction():
    """
    Mathematical proof that Markup on Cost and Margin on Selling Price
    are strictly distinct and yield different selling prices.
    """
    now = datetime.now(timezone.utc)
    base_materials = [
        MaterialCostLine(
            name="Cotton",
            quantity=2.0,
            unit="meters",
            unit_cost_inr=200.0,
            wastage_percent=0.0,
            price_confirmed_at=now,
        )
    ]
    base_labour = [
        LabourStageCostLine(
            stage_name="Embroidery",
            hours=4.0,
            hourly_rate_inr=150.0,
        )
    ]

    # 1. Target Margin on Selling Price: 25% margin, 7% commission
    req_margin = FairPriceCalculateRequest(
        materials=base_materials,
        labour_stages=base_labour,
        packaging_inr=0.0,
        overhead_percent=0.0,
        commission_percent=7.0,
        target_margin_percent=25.0,
        markup_percent=None,
    )
    res_margin = compute_fair_price(req_margin)

    # Total production cost = 400 + 600 = 1000
    assert res_margin.total_production_cost == 1000.0
    assert res_margin.pricing_mode == "margin"
    # Selling Price = 1000 / (1 - 0.32) = 1000 / 0.68 = ~1470.59
    assert res_margin.suggested_retail_price > 1400.0
    # Profit must equal 25% of selling price
    assert round(res_margin.profit_amount / res_margin.suggested_retail_price, 2) == 0.25

    # 2. Markup on Cost: 25% markup, 7% commission
    req_markup = FairPriceCalculateRequest(
        materials=base_materials,
        labour_stages=base_labour,
        packaging_inr=0.0,
        overhead_percent=0.0,
        commission_percent=7.0,
        target_margin_percent=None,
        markup_percent=25.0,
    )
    res_markup = compute_fair_price(req_markup)

    assert res_markup.total_production_cost == 1000.0
    assert res_markup.pricing_mode == "markup"
    # Profit on cost = 25% of 1000 = 250
    assert res_markup.profit_amount == 250.0
    # Base price = 1250, Selling price = 1250 / (1 - 0.07) = ~1344.09
    assert res_markup.suggested_retail_price < res_margin.suggested_retail_price
    # Key Rule: Margin of X% produces a higher selling price than Markup of X%
    assert res_margin.suggested_retail_price > res_markup.suggested_retail_price


def test_stale_material_price_flags():
    """Verify material prices confirmed past threshold are explicitly flagged as stale."""
    now = datetime.now(timezone.utc)
    stale_date = now - timedelta(days=45)  # 45 days ago
    fresh_date = now - timedelta(days=5)   # 5 days ago

    req = FairPriceCalculateRequest(
        materials=[
            MaterialCostLine(
                name="Aged Indigo Dye",
                quantity=1.0,
                unit="kg",
                unit_cost_inr=300.0,
                price_confirmed_at=stale_date,
            ),
            MaterialCostLine(
                name="Fresh Organic Cotton",
                quantity=5.0,
                unit="meters",
                unit_cost_inr=180.0,
                price_confirmed_at=fresh_date,
            ),
        ],
        labour_stages=[
            LabourStageCostLine(
                stage_name="Dyeing",
                hours=2.0,
                hourly_rate_inr=150.0,
            )
        ],
        stale_price_threshold_days=30,  # 30-day freshness policy
    )

    res = compute_fair_price(req)
    assert len(res.stale_material_flags) == 1
    assert "Aged Indigo Dye" in res.stale_material_flags[0]
    assert "45 days ago" in res.stale_material_flags[0]

    # Verify breakdown item stale attribute
    indigo_item = next(m for m in res.material_breakdown if m.name == "Aged Indigo Dye")
    assert indigo_item.stale is True

    cotton_item = next(m for m in res.material_breakdown if m.name == "Fresh Organic Cotton")
    assert cotton_item.stale is False


def test_labour_safeguard_missing_hourly_rate():
    """Labour Safeguard: Labour is never silently free. Missing rate marks estimate incomplete."""
    now = datetime.now(timezone.utc)
    req = FairPriceCalculateRequest(
        materials=[
            MaterialCostLine(
                name="Clay & Pigment",
                quantity=1.0,
                unit="kg",
                unit_cost_inr=120.0,
                price_confirmed_at=now,
            )
        ],
        labour_stages=[
            LabourStageCostLine(
                stage_name="Pottery Moulding",
                hours=5.0,
                hourly_rate_inr=None,  # Rate unrecorded!
            )
        ],
    )

    res = compute_fair_price(req)
    assert res.is_valid is False
    assert res.is_incomplete is True
    assert res.suggested_retail_price == 0.0
    assert len(res.missing_inputs) > 0
    assert "Pottery Moulding" in res.missing_inputs[0]
    assert "Labour is never assumed free" in res.missing_inputs[0]


def test_quote_validity_and_api_endpoint(client):
    """Verify quote validity calculation and API endpoints /pricing/calculate and /pricing/fairprice/estimate."""
    payload = {
        "materials": [
            {
                "name": "Mulberry Silk",
                "quantity": 2.0,
                "unit": "meters",
                "unit_cost_inr": 500.0,
                "wastage_percent": 5.0,
                "price_confirmed_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
        "labour_stages": [
            {
                "stage_name": "Weaving",
                "hours": 6.0,
                "hourly_rate_inr": 160.0,
            }
        ],
        "quote_validity_days": 14,
        "target_margin_percent": 30.0,
    }

    # Test /api/v1/pricing/calculate
    res1 = client.post("/api/v1/pricing/calculate", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["quote_validity_days"] == 14
    assert data1["is_valid"] is True
    assert data1["suggested_retail_price"] > 0
    assert data1["artisan_earnings"] > 0

    # Test alias /api/v1/pricing/fairprice/estimate
    res2 = client.post("/api/v1/pricing/fairprice/estimate", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["suggested_retail_price"] == data1["suggested_retail_price"]
