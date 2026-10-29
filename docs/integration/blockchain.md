# Kalaswar Blockchain & Layer-2 Provenance Integration Guide

> **Audience**: Blockchain Teammate / Smart Contract Engineer  
> **Status**: Ready for Smart Contract Plug-in  
> **Default Adapter**: `MockChainAdapter` (active) $\to$ Switchable to `PolygonChainAdapter`

---

## 1. Executive Architecture Overview

Kalaswar implements an enterprise-grade hybrid Web2/Web3 architecture designed for scale, minimal gas overhead, and artisan privacy:

1. **Off-Chain Cryptographic Batching**:
   * Instead of minting a gas-intensive NFT for every physical craft piece (which costs $0.20–$2.00 on L1/L2), Kalaswar aggregates up to **500 production passports into an off-chain binary Merkle tree**.
   * A single 32-byte Merkle root is anchored periodically onto Polygon Layer-2 (Amoy testnet / PoS mainnet), driving on-chain costs down to **under $0.0001 per handcrafted unit**.
2. **Individual Verifiability via Merkle Proofs**:
   * Each product passport holds a lightweight sibling proof (~9 hashes for 500 items).
   * Any customer or customs inspector scanning the product QR code can independently verify cryptographic inclusion in the on-chain root without exposing other products in the batch.
3. **Artisan Privacy Preservation**:
   * Direct PII (phone numbers, Aadhaar numbers, residential street addresses) is strictly excluded from on-chain leaves.
   * Leaves hash only coarse regional boundaries (e.g., `"Bolpur, Birbhum, West Bengal"`), anonymized maker IDs, guaranteed fair-wage percentage splits, and timestamps.
4. **PO Micro-Factoring Escrow**:
   * Corporate Purchase Orders (e.g. from FabIndia, Tata CliQ) follow a state machine:
     $$\text{po\_created} \longrightarrow \text{tokenized} \longrightarrow \text{advance\_disbursed (70\%)} \longrightarrow \text{delivered} \longrightarrow \text{escrow\_released (30\%)}$$

---

## 2. ChainAdapter Interface Contract

All blockchain interactions are decoupled via the `ChainAdapter` abstract interface in [`backend/app/adapters/chain.py`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/app/adapters/chain.py):

```python
class ChainAdapter(ABC):
    @abstractmethod
    async def commit_root(self, root: str) -> str:
        """
        Commits a 32-byte Merkle root (0x...) to the blockchain contract.
        Returns the transaction hash string.
        """
        pass

    @abstractmethod
    async def verify(self, root: str, tx_hash: str) -> bool:
        """
        Verifies whether the given Merkle root was anchored in the transaction receipt.
        """
        pass
```

### Adapters Available
* **`MockChainAdapter` (Default)**:
  * In-memory, deterministic simulation.
  * Produces `0x{sha256(root)}` transaction hashes, tracks block numbers (58,240,000+), and validates proofs instantly.
  * Allows the entire frontend, mobile app, and backend to run tests and demos without waiting for gas or RPCs.
* **`PolygonChainAdapter` (Skeleton ready for teammate)**:
  * Scaffolding for Polygon PoS / Amoy testnet.
  * Validates environment configurations (`RPC_URL`, `DPP_CONTRACT_ADDRESS`, `DPP_PRIVATE_KEY`).

---

## 3. What the Blockchain Teammate Must Provide

To switch from the mock adapter to live on-chain anchoring, the blockchain teammate must provide the following:

### A. Environment Variables in `backend/.env`
```env
# Layer-2 Network Settings
CHAIN_ADAPTER_TYPE=polygon
RPC_URL=https://rpc-amoy.polygon.technology
DPP_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
DPP_PRIVATE_KEY=0xabcdef...your_relayer_private_key_with_amoy_matic...
MERKLE_BATCH_SIZE=500
```

### B. Smart Contract Specification (DPP Anchor Contract)
Deploy a minimal Solidity contract on Polygon Amoy. A recommended interface:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KalaswarDPPRegistry {
    address public owner;
    
    // Mapping from Merkle Root to block timestamp
    mapping(bytes32 => uint256) public committedRoots;
    
    event MerkleRootAnchored(bytes32 indexed root, uint256 timestamp, uint256 batchSize);

    constructor() {
        owner = msg.sender;
    }

    function commitMerkleRoot(bytes32 root, uint256 batchSize) external {
        require(msg.sender == owner, "Only authorized relayer");
        require(committedRoots[root] == 0, "Root already anchored");
        
        committedRoots[root] = block.timestamp;
        emit MerkleRootAnchored(root, block.timestamp, batchSize);
    }

    function isRootCommitted(bytes32 root) external view returns (bool, uint256) {
        uint256 ts = committedRoots[root];
        return (ts > 0, ts);
    }
}
```

### C. PO Micro-Factoring Escrow Contract (Optional Extension)
If tokenizing POs as ERC-1155 vouchers or smart escrow vaults:
1. **Minting**: Locks corporate buyer PO value into escrow on `tokenize`.
2. **Advance**: Unlocks 70% to the SHG collective working capital vault on `advance_disbursed`.
3. **Settlement**: Unlocks remaining 30% to the SHG collective upon buyer delivery confirmation on `escrow_released`.

---

## 4. Canonical Leaf Hashing Specification

To ensure cross-platform reproducibility between Python backend, Solidity smart contracts, and TypeScript frontend verifiers:

```json
{
  "gps_region": "Bolpur, Birbhum, West Bengal",
  "maker_id": "cccccccc-0001-0000-0000-000000000001",
  "product_id": "11111111-0001-0000-0000-000000000001",
  "timestamps": "2026-10-25T10:00:00Z",
  "wage_split_pct": 68.0
}
```

1. **Sort keys alphabetically**: `gps_region`, `maker_id`, `product_id`, `timestamps`, `wage_split_pct`.
2. **Compact JSON representation**: separators `(',' , ':')` with no indentation or extra whitespace.
3. **Hashing**:
   $$\text{Leaf} = \text{0x} + \text{SHA256}(\text{Canonical JSON bytes})$$
4. **Binary Merkle Node Combination**:
   $$\text{Parent} = \text{0x} + \text{SHA256}(\text{Left bytes} + \text{Right bytes})$$
   *(If a layer has an odd count of leaves, the final leaf is duplicated to maintain balance).*

---

## 5. API Endpoints Reference

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/dpp/issue` | Issues new passport on product publish | `coordinator`, `admin`, `artisan` |
| `POST` | `/api/v1/dpp/batch-commit` | Triggers Merkle tree batch anchor to L2 | Teammate / Cron Worker |
| `GET` | `/public/passports/{token}` | Public, privacy-safe QR provenance view | Public / Unauthenticated |
| `GET` | `/public/passports/{token}/verify` | Cryptographic Merkle proof + L2 verification | Public / Unauthenticated |
| `POST` | `/api/v1/factoring/po` | Register PO for micro-factoring | `financier`, `coordinator`, `admin` |
| `POST` | `/api/v1/factoring/po/{id}/tokenize` | Step 2: Lock PO into Layer-2 escrow | `financier`, `admin` |
| `POST` | `/api/v1/factoring/po/{id}/disburse-advance`| Step 3: Disburse 70% working capital advance | `financier`, `admin` |
| `POST` | `/api/v1/factoring/po/{id}/deliver` | Step 4: Buyer acknowledges delivery | `buyer`, `coordinator`, `admin` |
| `POST` | `/api/v1/factoring/po/{id}/release-escrow` | Step 5: Release 30% final escrow balance | `financier`, `admin` |

---

## 6. Running the Batch Committer CLI

To test or manually trigger Merkle batch anchoring:
```bash
cd backend
python scripts/commit_dpp_batch.py --batch-size 500
```
