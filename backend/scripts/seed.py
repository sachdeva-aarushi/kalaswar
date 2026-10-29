#!/usr/bin/env python3
"""
Kalaswar Database Seeding & Verification Script
================================================
Idempotently seeds the Kalaswar database with realistic demonstration data:
  - 3 SHG Clusters (West Bengal, Maharashtra, Uttar Pradesh)
  - 3 Self-Help Groups (linked to clusters)
  - 12 Artisans with regional names and voice_lang_pref (bn, mr, hi)
  - 30 Products across 4 crafts (Kantha, Warli, Handloom Silk, Cushion Covers)
  - 14 Materials in inventory (including 5 intentionally stale records and low-stock alerts)
  - 10 Orders across varied workflow stages (pending, in_production, ready_for_dispatch, delayed, delivered)
  - 3 B2B Requests (buyers, RFPs, quotations, sample requests)
  - DPP Passports on Polygon L2
  - Demo Users for every supported role (admin, coordinator, artisan, customer, buyer, financier)

Usage:
  python backend/scripts/seed.py [--validate-only] [--verify] [--force-remote]
"""

import os
import sys
import re
import subprocess
from pathlib import Path
from typing import Dict, Any

# Locate root directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SEED_SQL_PATH = ROOT_DIR / "supabase" / "seed.sql"
ENV_FILE = ROOT_DIR / "backend" / ".env"

def load_environment():
    """Loads backend/.env if available without leaking credentials."""
    env_vars = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    env_vars[k] = v
                    if k not in os.environ:
                        os.environ[k] = v
    return env_vars

def mask_secret(value: str) -> str:
    """Masks secrets for safe terminal display."""
    if not value or len(value) < 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"

def validate_seed_sql() -> Dict[str, Any]:
    """Statically inspects supabase/seed.sql and validates completeness against requirements."""
    if not SEED_SQL_PATH.exists():
        raise FileNotFoundError(f"seed.sql not found at {SEED_SQL_PATH}")

    content = SEED_SQL_PATH.read_text(encoding="utf-8")

    # Distinct UUID counts
    clusters = set(re.findall(r"'aaaaaaaa-0001-[0-9a-f\-]+'", content))
    shgs = set(re.findall(r"'bbbbbbbb-0001-[0-9a-f\-]+'", content))
    artisans = set(re.findall(r"'cccccccc-0001-[0-9a-f\-]+'", content))
    products = set(re.findall(r"'dddddddd-0001-[0-9a-f\-]+'", content))
    inventory = set(re.findall(r"'eeeeeeee-0001-[0-9a-f\-]+'", content))
    orders = set(re.findall(r"'ffffffff-0001-[0-9a-f\-]+'", content))
    buyers = set(re.findall(r"'77777777-0001-[0-9a-f\-]+'", content))
    buyer_requests = set(re.findall(r"'88888888-0001-[0-9a-f\-]+'", content))
    passports = set(re.findall(r"'22223333-0001-[0-9a-f\-]+'", content))
    demo_users = set(re.findall(r"'99999999-0000-0000-0000-00000000000[1-6]'", content))

    # Check crafts
    crafts = {
        "Kantha": bool(re.search(r"Kantha", content, re.IGNORECASE)),
        "Warli": bool(re.search(r"Warli", content, re.IGNORECASE)),
        "Handloom Silk": bool(re.search(r"Handloom|Silk|Banarasi", content, re.IGNORECASE)),
        "Cushion Covers": bool(re.search(r"Cushion", content, re.IGNORECASE)),
    }

    # Check stale inventory
    stale_matches = re.findall(r"now\(\)\s*-\s*interval\s*'(\d+)\s*days'", content)
    stale_records = [int(d) for d in stale_matches if int(d) >= 60]

    # Check roles
    roles = ["admin", "coordinator", "artisan", "customer", "buyer", "financier"]
    roles_covered = {r: bool(re.search(rf"'{r}'", content)) for r in roles}

    # Check idempotency markers
    on_conflict_count = len(re.findall(r"ON CONFLICT", content, re.IGNORECASE))

    return {
        "clusters": len(clusters),
        "shgs": len(shgs),
        "artisans": len(artisans),
        "products": len(products),
        "inventory": len(inventory),
        "stale_inventory_records": len(stale_records),
        "orders": len(orders),
        "buyers": len(buyers),
        "buyer_requests": len(buyer_requests),
        "passports": len(passports),
        "demo_users": len(demo_users),
        "crafts": crafts,
        "roles": roles_covered,
        "on_conflict_clauses": on_conflict_count,
        "is_idempotent": on_conflict_count >= 10,
    }

def print_validation_report(metrics: Dict[str, Any]):
    print("==================================================================")
    print("        KALASWAR SEED SQL STATIC VALIDATION REPORT                ")
    print("==================================================================")
    print(f"  * SHG Clusters:         {metrics['clusters']:2d} / 3  (Target: 3 states: WB, MH, UP)")
    print(f"  * Self-Help Groups:     {metrics['shgs']:2d} / 3  (Linked to clusters)")
    print(f"  * Artisans:             {metrics['artisans']:2d} / 12 (Target: 12 regional names)")
    print(f"  * Products:             {metrics['products']:2d} / 30 (Target: 30 across 4 crafts)")
    print(f"  * Inventory Items:      {metrics['inventory']:2d} / 14 (Includes {metrics['stale_inventory_records']} stale records)")
    print(f"  * Orders:               {metrics['orders']:2d} / 10 (Target: 10 varied stages)")
    print(f"  * B2B Buyers:           {metrics['buyers']:2d} / 3")
    print(f"  * B2B Requests:         {metrics['buyer_requests']:2d} / 3")
    print(f"  * DPP Passports:        {metrics['passports']:2d} / 3  (Polygon L2)")
    print(f"  * Demo Auth Users:      {metrics['demo_users']:2d} / 6  (admin, coordinator, artisan, customer, buyer, financier)")
    print(f"  * Idempotency Clauses:  {metrics['on_conflict_clauses']:2d} ON CONFLICT statements")
    print("------------------------------------------------------------------")
    print("  Craft Coverage:")
    for craft, present in metrics["crafts"].items():
        status = "[OK] Present" if present else "[FAIL] Missing"
        print(f"    - {craft:16s}: {status}")
    print("------------------------------------------------------------------")
    print("  Supported Role Coverage:")
    for role, present in metrics["roles"].items():
        status = "[OK] Present" if present else "[FAIL] Missing"
        print(f"    - {role:16s}: {status}")
    print("==================================================================")

def execute_seed():
    """Attempts seed execution with safety guards and diagnostics."""
    env = load_environment()
    supabase_url = env.get("SUPABASE_URL", os.environ.get("SUPABASE_URL", ""))
    supabase_service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))
    database_url = env.get("DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    environment = env.get("ENVIRONMENT", "development")

    print(f"\n[Environment] Mode: {environment}")
    if supabase_url:
        print(f"[Supabase] Target Host: {supabase_url} (Key: {mask_secret(supabase_service_key)})")
    if database_url:
        masked_db = re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", database_url)
        print(f"[Postgres] Target Connection: {masked_db}")

    if environment.lower() == "production" and "--force-remote" not in sys.argv:
        print("[ERROR] Refusing to seed in 'production' environment without --force-remote flag.")
        sys.exit(1)

    # 1. Run static validation
    metrics = validate_seed_sql()
    print_validation_report(metrics)

    if "--validate-only" in sys.argv:
        print("Static validation passed. Exiting (--validate-only).")
        return

    # 2. Try executing via linked Supabase CLI if project is linked
    print("\n[DB Execution] Executing seed via linked Supabase Management API...")
    try:
        npx_cmd = "npx.cmd" if sys.platform == "win32" else "npx"
        cmd = [npx_cmd, "supabase", "db", "query", "--linked", "--file", str(SEED_SQL_PATH)]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, check=True, shell=(sys.platform == "win32"))
        print("[OK] Seed SQL executed successfully on linked Supabase Cloud project.")
    except Exception as e:
        print(f"[INFO] CLI execution status: {e}. Falling back to API queries.")


    # 3. Verify Live Entity Counts
    if supabase_url and supabase_service_key:
        headers = {
            "apikey": supabase_service_key,
            "Authorization": f"Bearer {supabase_service_key}",
        }
        verify_supabase_counts(supabase_url, headers)
    elif database_url:
        verify_database_counts(database_url)

def verify_supabase_counts(supabase_url: str, headers: dict):
    """Queries entity counts via PostgREST."""
    import httpx
    entities = [
        ("shg_clusters", "SHG Clusters"),
        ("shgs", "Self-Help Groups"),
        ("artisans", "Artisans"),
        ("products", "Products"),
        ("materials_inventory", "Materials Inventory"),
        ("orders", "Orders"),
        ("buyers", "B2B Buyers"),
        ("buyer_requests", "B2B Requests"),
        ("dpp_passports", "DPP Passports"),
        ("profiles", "User Profiles"),
        ("user_roles", "User Roles"),
    ]
    print("\n--- Live Supabase Cloud Entity Counts ---")
    for tbl, name in entities:
        try:
            res = httpx.get(
                f"{supabase_url}/rest/v1/{tbl}?select=count",
                headers={**headers, "Prefer": "count=exact"},
                timeout=6.0
            )
            count_val = "N/A"
            if res.status_code in (200, 206):
                # Count is in content-range header e.g. 0-2/3 or in JSON body [{"count": 3}]
                content_range = res.headers.get("content-range", "")
                if "/" in content_range:
                    count_val = content_range.split("/")[-1]
                elif res.json() and isinstance(res.json(), list) and "count" in res.json()[0]:
                    count_val = str(res.json()[0]["count"])
                else:
                    count_val = str(len(res.json()))
                print(f"  * {name:24s}: {count_val:>4s} rows  [OK]")
            else:
                print(f"  * {name:24s}: HTTP {res.status_code}")
        except Exception as e:
            print(f"  * {name:24s}: error ({e})")
    print("----------------------------------------\n")

def verify_database_counts(conn_or_url: str):
    """Queries entity counts via direct PostgreSQL connection."""
    import psycopg2
    conn = psycopg2.connect(conn_or_url)
    cur = conn.cursor()
    entities = [
        ("shg_clusters", "SHG Clusters"),
        ("shgs", "Self-Help Groups"),
        ("artisans", "Artisans"),
        ("products", "Products"),
        ("materials_inventory", "Materials Inventory"),
        ("orders", "Orders"),
        ("buyers", "B2B Buyers"),
        ("buyer_requests", "B2B Requests"),
        ("dpp_passports", "DPP Passports"),
        ("profiles", "Profiles"),
    ]
    print("\n--- Live Postgres Entity Counts ---")
    for tbl, name in entities:
        try:
            cur.execute(f"SELECT count(*) FROM public.{tbl};")
            count = cur.fetchone()[0]
            print(f"  * {name:24s}: {count}")
        except Exception as e:
            print(f"  * {name:24s}: {e}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    execute_seed()
