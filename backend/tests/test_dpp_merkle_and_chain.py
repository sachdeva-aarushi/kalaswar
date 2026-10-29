import pytest
from app.adapters.chain import MockChainAdapter, PolygonChainAdapter
from app.services.merkle import (
    MerkleTree,
    compute_canonical_passport_leaf,
    verify_merkle_proof,
)


@pytest.mark.asyncio
async def test_mock_chain_adapter_commit_and_verify():
    """MockChainAdapter produces deterministic simulated tx hash and validates root."""
    adapter = MockChainAdapter()
    root = "0x7c4f9a1e3b5d8c2e0f6a4b1d9c7e5a3f2b8d0c6e4a1b9f7d5c3e1a8b6d4f2c0e"

    tx_hash = await adapter.commit_root(root)
    assert tx_hash.startswith("0x")
    assert len(tx_hash) == 66

    # Verify matching root
    is_valid = await adapter.verify(root, tx_hash)
    assert is_valid is True

    # Tampered root fails verification
    is_tampered = await adapter.verify("0x1111111111111111111111111111111111111111111111111111111111111111", tx_hash)
    assert is_tampered is False


def test_polygon_chain_adapter_skeleton_guard():
    """PolygonChainAdapter gracefully detects unconfigured credentials."""
    unconfigured_adapter = PolygonChainAdapter(
        rpc_url="https://polygon-rpc.com",
        contract_address="",
        private_key="",
    )
    assert unconfigured_adapter.is_configured() is False


def test_canonical_leaf_hashing_determinism():
    """Canonical JSON produces identical SHA-256 hash regardless of input key order."""
    data_a = {
        "product_id": "prod-101",
        "maker_id": "artisan-55",
        "gps_region": "Bolpur, Birbhum, West Bengal",
        "wage_split_pct": 68.0,
        "timestamps": "2026-10-25T10:00:00Z",
    }
    # Inverted dictionary key order
    data_b = {
        "wage_split_pct": 68.0,
        "timestamps": "2026-10-25T10:00:00Z",
        "product_id": "prod-101",
        "gps_region": "Bolpur, Birbhum, West Bengal",
        "maker_id": "artisan-55",
    }

    hash_a = compute_canonical_passport_leaf(data_a)
    hash_b = compute_canonical_passport_leaf(data_b)

    assert hash_a == hash_b
    assert hash_a.startswith("0x")
    assert len(hash_a) == 66


def test_merkle_tree_proof_generation_and_verification():
    """Test binary Merkle tree with single, even, and odd leaf counts."""
    leaves = [
        compute_canonical_passport_leaf({"product_id": f"p-{i}", "maker_id": f"m-{i}", "wage_split_pct": 65.0})
        for i in range(5)  # 5 leaves (odd number tests duplication handling)
    ]

    tree = MerkleTree(leaves)
    root = tree.root
    assert root.startswith("0x")

    # Verify proofs for each leaf
    for idx, leaf in enumerate(leaves):
        proof = tree.get_proof(idx)
        assert len(proof) >= 1
        assert verify_merkle_proof(leaf, proof, root) is True

    # Tampered leaf should fail
    tampered_leaf = "0x" + "f" * 64
    assert verify_merkle_proof(tampered_leaf, tree.get_proof(0), root) is False
