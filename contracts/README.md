# Kalaswar ProductStageTracker Smart Contract

`ProductStageTracker.sol` is an immutable, gas-optimized Solidity smart contract for anchoring canonical Merkle roots of Kalaswar product provenance stage events onto Polygon Layer-2 (Amoy Testnet and Polygon PoS Mainnet).

---

## 1. Architectural Scope & Invariant Guarantees

* **Dedicated Provenance Registry**: Exclusively stores immutable batch Merkle roots, leaf counts, timestamps, and authorized submitter addresses.
* **Decoupled from Payments**: Zero ERC-20, native token, or UPI financial logic. Financial settlement runs independently through standard escrow/banking rails.
* **Strict Privacy Boundary**: No Personally Identifiable Information (artisan phone numbers, Aadhaar numbers, residential street addresses) or raw GPS coordinates are ever committed on-chain.
* **Idempotency & Duplicate Protection**: Reverts on duplicate `batchId` submissions.

---

## 2. EVM Storage Layout & Gas Trade-Offs

### A. Tight Storage Packing (3 Slots per Batch)

In the EVM, storage writes (`SSTORE`) are the most expensive operations (up to 20,000 gas for a zero-to-non-zero write). `ProductStageTracker` packs each batch record into exactly **3 storage words (96 bytes)**:

```
┌─────────────────────────────────────────────────────────────┐
│ Slot 0: bytes32 batchId (32 bytes)                          │
├─────────────────────────────────────────────────────────────┤
│ Slot 1: bytes32 merkleRoot (32 bytes)                       │
├───────────────────────────────┬──────────────┬──────────────┤
│ Slot 2: address submitter     │ uint64 time  │ uint32 count │
│         (20 bytes)            │ (8 bytes)    │ (4 bytes)    │
└───────────────────────────────┴──────────────┴──────────────┘
```

* `leafCount` (uint32) supports up to $4,294,967,295$ leaves per batch (far exceeding our 500-leaf batch limit).
* `committedAt` (uint64) safely covers Unix epoch timestamps well past year 2038.
* `submitter` (address, 20 bytes) identifies the authenticated relayer.

### B. Gas Cost Analysis

1. **First-time Batch Commit**:
   * Initial `SSTORE` (Slot 0): ~22,100 gas
   * Initial `SSTORE` (Slot 1): ~22,100 gas
   * Initial `SSTORE` (Slot 2 packed): ~22,100 gas
   * Dynamic array push (`_batchIds.push`): ~22,100 gas
   * Event emission (`BatchCommitted` with 3 indexed topics): ~2,500 gas
   * Access check + execution overhead: ~4,000 gas
   * **Total estimated gas per batch commit**: ~95,000 gas (~$0.0001 USD on Polygon PoS at 30 gwei).
   * **Amortized cost per product leaf (batch size 500)**: **<$0.0000003 USD**.

2. **Why Not Store Individual Leaves On-Chain?**
   * Committing 500 individual stage records directly to contract storage would cost $\sim 500 \times 45,000 = 22,500,000\text{ gas}$ (exceeding block limits or costing orders of magnitude more).
   * Binary Merkle tree batching compresses 500 records into a single 32-byte root, reducing on-chain gas expenditure by **>99.8%**.

3. **Read Operation Gas Efficiency**:
   * `isBatchCommitted`: Only reads `Slot 2` (`committedAt != 0`), executing in a single `SLOAD` (~2,100 gas cold, 100 warm).
   * `getBatch`: Loads all 3 slots into memory in a single view call (0 gas when called off-chain via RPC).

---

## 3. Contract Interface Specification

### Custom Errors
* `InvalidBatchId()`: `batchId == bytes32(0)`
* `InvalidMerkleRoot()`: `merkleRoot == bytes32(0)`
* `InvalidLeafCount()`: `leafCount == 0`
* `InvalidAdminAddress()`: Deployer admin address is zero
* `BatchAlreadyExists(bytes32 batchId)`: Re-submission of existing `batchId`
* `BatchNotFound(bytes32 batchId)`: Lookup of uncommitted `batchId`
* `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)`: Non-relayer submission

### External Functions
* `commitBatch(bytes32 batchId, bytes32 merkleRoot, uint32 leafCount)`: Commit new batch (restricted to `ROOT_SUBMITTER_ROLE`).
* `getBatch(bytes32 batchId)`: Returns `BatchCommitment` struct.
* `isBatchCommitted(bytes32 batchId)`: Quick existence check.
* `getBatchCount()`: Total batches anchored.
* `getBatchIdAtIndex(uint256 index)`: Enumerate committed batch IDs.

---

## 4. Foundry Compilation & Testing

```bash
# Compile contracts
forge build

# Run unit tests
forge test -vvv

# Format code
forge fmt --check
```

---

## 5. Deployment Instructions

```bash
# Dry-run script on local anvil
forge script script/DeployProductStageTracker.s.sol --rpc-url http://127.0.0.1:8545

# Deploy to Polygon Amoy testnet
forge script script/DeployProductStageTracker.s.sol \
  --rpc-url polygon_amoy \
  --broadcast \
  --verify
```

