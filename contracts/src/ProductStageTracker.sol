// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ProductStageTracker
 * @notice Immutable Merkle-root commitment registry for Kalaswar product provenance events.
 * @dev Anchors canonical Merkle roots of batched provenance stage events to Polygon Layer-2.
 *
 * Architecture & Privacy Guarantees:
 * - This contract is strictly an immutable commitment registry for cryptographic Merkle roots.
 * - Complete stage event records, PII (artisan phone numbers, Aadhaar, residential street addresses),
 *   and precise GPS coordinates remain off-chain in PostgreSQL and the private verifier network.
 * - This contract does NOT handle ETH payments, ERC20 tokens, UPI settlements, NFTs, or asset custody.
 */
contract ProductStageTracker is AccessControl {
    // ─── Roles ───────────────────────────────────────────────────────────────────

    /// @notice Role identifier for authorized backend relayers permitted to commit batch roots.
    bytes32 public constant ROOT_SUBMITTER_ROLE = keccak256("ROOT_SUBMITTER_ROLE");

    // ─── Data Structures ─────────────────────────────────────────────────────────

    /**
     * @notice Minimal metadata structure representing an immutable Merkle batch commitment.
     * @dev Compact storage packing:
     *      Slot 0: bytes32 batchId (32 bytes)
     *      Slot 1: bytes32 merkleRoot (32 bytes)
     *      Slot 2: uint32 leafCount (4 bytes) + uint64 committedAt (8 bytes) + address submitter (20 bytes) = 32 bytes
     *      Total: Exactly 3 EVM storage words (96 bytes) per batch.
     */
    struct BatchCommitment {
        bytes32 batchId;
        bytes32 merkleRoot;
        uint32 leafCount;
        uint64 committedAt;
        address submitter;
    }

    // ─── Events ──────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted whenever a new Merkle batch is successfully anchored to the blockchain.
     * @param batchId The unique identifier of the committed batch.
     * @param merkleRoot The 32-byte cryptographic Merkle root of the batch.
     * @param leafCount Number of canonical provenance event leaves included in the tree.
     * @param submitter The relayer account that submitted the transaction.
     * @param timestamp The block timestamp when the root was anchored.
     */
    event BatchCommitted(
        bytes32 indexed batchId,
        bytes32 indexed merkleRoot,
        uint32 leafCount,
        address indexed submitter,
        uint64 timestamp
    );

    // ─── Custom Errors ───────────────────────────────────────────────────────────

    /// @notice Reverted when an operation is attempted with an existing batch ID.
    error BatchAlreadyExists(bytes32 batchId);

    /// @notice Reverted when requesting a batch ID that has not been committed.
    error BatchNotFound(bytes32 batchId);

    /// @notice Reverted when a provided batch ID is zero.
    error InvalidBatchId();

    /// @notice Reverted when a provided Merkle root is zero.
    error InvalidMerkleRoot();

    /// @notice Reverted when a provided leaf count is zero.
    error InvalidLeafCount();

    /// @notice Reverted when the initial admin address is zero.
    error InvalidAdminAddress();

    // ─── State Variables ─────────────────────────────────────────────────────────

    /// @dev Mapping from batch ID to its immutable commitment record.
    mapping(bytes32 => BatchCommitment) private _batches;

    /// @dev Ordered list of committed batch IDs for indexing and off-chain enumeration.
    bytes32[] private _batchIds;

    // ─── Constructor ─────────────────────────────────────────────────────────────

    /**
     * @notice Initializes the contract and assigns default admin and submitter roles.
     * @param initialAdmin The address granted DEFAULT_ADMIN_ROLE and ROOT_SUBMITTER_ROLE.
     */
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) {
            revert InvalidAdminAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ROOT_SUBMITTER_ROLE, initialAdmin);
    }

    // ─── External State-Modifying Functions ───────────────────────────────────────

    /**
     * @notice Commits an immutable Merkle batch root to the blockchain registry.
     * @dev Restricted to callers with ROOT_SUBMITTER_ROLE.
     *      Reverts if:
     *      - `batchId` is bytes32(0)
     *      - `merkleRoot` is bytes32(0)
     *      - `leafCount` is 0
     *      - `batchId` has already been committed
     * @param batchId Unique identifier for the Merkle batch.
     * @param merkleRoot 32-byte cryptographic root of the binary Merkle tree.
     * @param leafCount Number of canonical provenance stage event leaves in this batch.
     */
    function commitBatch(
        bytes32 batchId,
        bytes32 merkleRoot,
        uint32 leafCount
    ) external onlyRole(ROOT_SUBMITTER_ROLE) {
        if (batchId == bytes32(0)) revert InvalidBatchId();
        if (merkleRoot == bytes32(0)) revert InvalidMerkleRoot();
        if (leafCount == 0) revert InvalidLeafCount();
        if (_batches[batchId].committedAt != 0) revert BatchAlreadyExists(batchId);

        uint64 timestamp = uint64(block.timestamp);

        _batches[batchId] = BatchCommitment({
            batchId: batchId,
            merkleRoot: merkleRoot,
            leafCount: leafCount,
            committedAt: timestamp,
            submitter: msg.sender
        });

        _batchIds.push(batchId);

        emit BatchCommitted(batchId, merkleRoot, leafCount, msg.sender, timestamp);
    }

    // ─── External View / Inspection Functions ────────────────────────────────────

    /**
     * @notice Retrieves full batch commitment details by batch ID.
     * @param batchId The unique batch identifier.
     * @return commitment The BatchCommitment struct containing root, metadata, and submitter.
     */
    function getBatch(bytes32 batchId) external view returns (BatchCommitment memory commitment) {
        commitment = _batches[batchId];
        if (commitment.committedAt == 0) {
            revert BatchNotFound(batchId);
        }
    }

    /**
     * @notice Checks whether a batch ID has already been committed to the registry.
     * @param batchId The unique batch identifier.
     * @return exists True if committed, false otherwise.
     */
    function isBatchCommitted(bytes32 batchId) external view returns (bool exists) {
        return _batches[batchId].committedAt != 0;
    }

    /**
     * @notice Returns total number of batches committed to date.
     * @return count Total count of committed batches.
     */
    function getBatchCount() external view returns (uint256 count) {
        return _batchIds.length;
    }

    /**
     * @notice Returns the batch ID at a given index in the registry.
     * @param index The zero-based array index.
     * @return batchId The unique batch ID at that index.
     */
    function getBatchIdAtIndex(uint256 index) external view returns (bytes32 batchId) {
        if (index >= _batchIds.length) {
            revert BatchNotFound(bytes32(index));
        }
        return _batchIds[index];
    }
}

