import uuid
import pytest
from fastapi.testclient import TestClient


def test_public_product_catalog_pagination(client: TestClient):
    """Public catalog endpoint returns paginated results with items, total, and pages."""
    res = client.get("/api/v1/products?page=1&page_size=2")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert len(data["items"]) <= 2
    assert data["total"] >= 1


def test_product_catalog_filters(client: TestClient):
    """Verify category, craft search, and price range filters."""
    # Category filter
    res_cat = client.get("/api/v1/products?category=Home Decor")
    assert res_cat.status_code == 200
    for item in res_cat.json()["items"]:
        assert "Home Decor" in item["category"]

    # Craft keyword search
    res_craft = client.get("/api/v1/products?craft=Kantha")
    assert res_craft.status_code == 200
    assert len(res_craft.json()["items"]) >= 1

    # Price range bounds
    res_price = client.get("/api/v1/products?min_price=2000&max_price=3500")
    assert res_price.status_code == 200
    for item in res_price.json()["items"]:
        assert 2000 <= item["price"] <= 3500


def test_get_product_detail_and_404(client: TestClient):
    """Retrieve product by ID; test 404 on nonexistent ID."""
    # First get existing product
    list_res = client.get("/api/v1/products?page=1&page_size=1")
    first_item = list_res.json()["items"][0]
    prod_id = first_item["id"]

    res = client.get(f"/api/v1/products/{prod_id}")
    assert res.status_code == 200
    assert res.json()["id"] == prod_id
    assert res.json()["title"] == first_item["title"]

    # Unknown product returns 404
    missing_id = str(uuid.uuid4())
    res_missing = client.get(f"/api/v1/products/{missing_id}")
    assert res_missing.status_code == 404


def test_product_create_and_update_role_guards(
    client: TestClient,
    coordinator_headers: dict,
    customer_headers: dict,
):
    """Product creation and mutation require coordinator, artisan, or admin role."""
    artisan_id = str(uuid.uuid4())
    payload = {
        "artisan_id": artisan_id,
        "title": "Dokra Bell Metal Tribal Figurine",
        "description": "Lost-wax cast brass tribal figurine with fine filigree wire details.",
        "category": "Metal Crafts",
        "price": 2450.0,
        "availability": True,
    }

    # Unauthenticated rejected (401)
    res_unauth = client.post("/api/v1/products", json=payload)
    assert res_unauth.status_code == 401

    # Customer role rejected (403)
    res_cust = client.post("/api/v1/products", json=payload, headers=customer_headers)
    assert res_cust.status_code == 403

    # Coordinator accepted (201)
    res_coord = client.post("/api/v1/products", json=payload, headers=coordinator_headers)
    assert res_coord.status_code == 201
    created = res_coord.json()
    assert created["title"] == payload["title"]
    prod_id = created["id"]

    # Patch updates product
    update_res = client.patch(
        f"/api/v1/products/{prod_id}",
        json={"price": 2750.0, "availability": False},
        headers=coordinator_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["price"] == 2750.0
    assert update_res.json()["availability"] is False

    # Delete product
    del_res = client.delete(f"/api/v1/products/{prod_id}", headers=coordinator_headers)
    assert del_res.status_code == 200
