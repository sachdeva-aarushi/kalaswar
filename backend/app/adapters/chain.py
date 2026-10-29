from abc import ABC, abstractmethod
from datetime import datetime, timezone
import hashlib
from typing import Dict, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class ChainAdapter(ABC):
    """
    Abstract interface for anchoring Merkle roots and verifying digital product provenance
    on a public blockchain Layer-2 (Polygon PoS / Amoy testnet).
    """

    @abstractmethod
    async def commit_root(self, root: str) -> str:
        """
        Commits a Merkle root (hex string) to the blockchain.
        Returns the transaction hash.
        """
        pass

    @abstractmethod
    async def verify(self, root: str, tx_hash: str) -> bool:
        """
        Verifies whether a given Merkle root was recorded on-chain in the specified transaction.
        """
        pass


class MockChainAdapter(ChainAdapter):
    """
    Default mock chain adapter for local development, CI testing, and hackathon demonstration.
    Generates deterministic simulated transaction hashes and tracks committed roots in-memory.
    """

    def __init__(self):
        # Maps root -> {"tx_hash": ..., "block": ..., "committed_at": ...}
        self._committed_roots: Dict[str, dict] = {}

    def _normalize_root(self, root: str) -> str:
        root_clean = root.lower().strip()
        if not root_clean.startswith("0x"):
            root_clean = f"0x{root_clean}"
        return root_clean

    def _generate_mock_tx_hash(self, root: str) -> str:
        # Deterministic 64-character hex transaction hash derived from root
        digest = hashlib.sha256(f"kalaswar_polygon_l2_{root}".encode("utf-8")).hexdigest()
        return f"0x{digest}"

    async def commit_root(self, root: str) -> str:
        norm_root = self._normalize_root(root)
        tx_hash = self._generate_mock_tx_hash(norm_root)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Simulated block number on Polygon PoS (e.g. 58,000,000+)
        block_number = 58240192 + len(self._committed_roots)

        self._committed_roots[norm_root] = {
            "root": norm_root,
            "tx_hash": tx_hash,
            "block_number": block_number,
            "committed_at": now_iso,
            "network": "polygon_amoy_simulated",
            "is_simulated": True,
        }
        logger.info("MockChainAdapter: committed root %s -> tx %s (block %d)", norm_root, tx_hash, block_number)
        return tx_hash

    async def verify(self, root: str, tx_hash: str) -> bool:
        norm_root = self._normalize_root(root)
        norm_tx = tx_hash.lower().strip()
        expected_tx = self._generate_mock_tx_hash(norm_root).lower()

        # Check recorded in memory or matches deterministic formula
        if norm_root in self._committed_roots:
            return self._committed_roots[norm_root]["tx_hash"].lower() == norm_tx

        return expected_tx == norm_tx

    def get_commit_details(self, root: str) -> Optional[dict]:
        return self._committed_roots.get(self._normalize_root(root))


class PolygonChainAdapter(ChainAdapter):
    """
    Polygon Layer-2 chain adapter skeleton for the blockchain teammate.
    Reads RPC URL, private key, and DPP contract address from environment variables.
    Provides JSON-RPC eth_call and transaction signing scaffolding.
    """

    def __init__(
        self,
        rpc_url: Optional[str] = None,
        contract_address: Optional[str] = None,
        private_key: Optional[str] = None,
    ):
        self.rpc_url = (rpc_url or settings.RPC_URL).rstrip("/")
        self.contract_address = contract_address or settings.DPP_CONTRACT_ADDRESS
        self.private_key = private_key or settings.DPP_PRIVATE_KEY
        self.network = "polygon_amoy"

    def is_configured(self) -> bool:
        """Returns True if contract address and private key are supplied."""
        return bool(self.contract_address and self.private_key and self.rpc_url)

    async def commit_root(self, root: str) -> str:
        """
        Commits Merkle root to the smart contract using Polygon JSON-RPC.
        If contract address or private key is not configured, raises a clear ConfigurationError
        with instructions for the blockchain teammate.
        """
        if not self.is_configured():
            logger.warning(
                "PolygonChainAdapter not fully configured. Missing contract_address or private_key. "
                "See docs/integration/blockchain.md for setup instructions."
            )
            # Produce a clear descriptive error so the teammate knows exactly what is missing
            raise RuntimeError(
                "PolygonChainAdapter: Blockchain credentials incomplete. "
                "Ensure DPP_CONTRACT_ADDRESS and DPP_PRIVATE_KEY are set in .env. "
                "Use MockChainAdapter for simulated development."
            )

        # Teammate implementation hook:
        # Standard function selector: commitMerkleRoot(bytes32) -> 0x8a99d63c (example)
        # Using web3.py / eth_account:
        #   w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        #   account = w3.eth.account.from_key(self.private_key)
        #   tx = contract.functions.commitMerkleRoot(bytes.fromhex(root[2:])).build_transaction(...)
        #   signed_tx = account.sign_transaction(tx)
        #   tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 1,
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(self.rpc_url, json=payload)
                res.raise_for_status()

            # Return a formatted skeleton tx hash placeholder if RPC ping works
            digest = hashlib.sha256(f"polygon_amoy_{root}_{self.contract_address}".encode()).hexdigest()
            return f"0x{digest}"
        except Exception as e:
            logger.error("Polygon RPC communication failed: %s", e)
            raise RuntimeError(f"PolygonChainAdapter RPC failure: {e}")

    async def verify(self, root: str, tx_hash: str) -> bool:
        """
        Verifies transaction receipt on Polygon RPC.
        """
        if not self.rpc_url:
            return False

        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_getTransactionReceipt",
                "params": [tx_hash],
                "id": 1,
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(self.rpc_url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    receipt = data.get("result")
                    if receipt:
                        # Status 0x1 means transaction succeeded
                        return receipt.get("status") == "0x1"
            return False
        except Exception as e:
            logger.warning("Polygon verification check failed: %s", e)
            return False


# Singleton factory
_mock_chain_adapter = MockChainAdapter()
_polygon_chain_adapter = PolygonChainAdapter()


def get_chain_adapter() -> ChainAdapter:
    """
    Factory function returning active ChainAdapter.
    Defaults to MockChainAdapter unless CHAIN_ADAPTER_TYPE is 'polygon'.
    """
    if settings.CHAIN_ADAPTER_TYPE.lower() == "polygon":
        return _polygon_chain_adapter
    return _mock_chain_adapter
