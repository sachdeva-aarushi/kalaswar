"""
CLI Worker: Merkle Batch Anchoring for Digital Product Passports (DPP).
Runs daily (or on demand) to batch pending production passport leaf hashes
into a Merkle tree and anchor the root to Polygon Layer-2.
Usage:
    python scripts/commit_dpp_batch.py [--batch-size 500]
"""

import argparse
import asyncio
import os
import sys

# Add backend directory to Python sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.services.merkle import merkle_service


async def main():
    parser = argparse.ArgumentParser(description="Kalaswar DPP Merkle Batch Committer")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=settings.MERKLE_BATCH_SIZE,
        help="Maximum number of passports to aggregate per Merkle root (default: 500)",
    )
    args = parser.parse_args()

    print(f"[*] Starting DPP Merkle batch commit (max batch size: {args.batch_size})...")
    result = await merkle_service.commit_batch(batch_size=args.batch_size)

    print(f"[*] Result Status : {result.get('status')}")
    print(f"[*] Message       : {result.get('message')}")
    print(f"[*] Passports     : {result.get('total_passports')}")
    if result.get("merkle_root"):
        print(f"[*] Merkle Root   : {result.get('merkle_root')}")
        print(f"[*] Polygon Tx    : {result.get('polygon_tx_hash')}")
        print(f"[*] Network       : {result.get('chain')}")
        print(f"[*] Committed At  : {result.get('committed_at')}")

    print("[SUCCESS] Batch job finished successfully.")


if __name__ == "__main__":
    asyncio.run(main())
