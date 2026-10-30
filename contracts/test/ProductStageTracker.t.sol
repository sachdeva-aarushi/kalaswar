// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ProductStageTracker} from "../src/ProductStageTracker.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract ProductStageTrackerTest is Test {
    ProductStageTracker internal tracker;

    address internal admin = address(0xA11CE);
    address internal submitter = address(0xB0B);
    address internal unauthorized = address(0xBAD);

    bytes32 internal sampleBatchId1 = keccak256("batch-0001");
    bytes32 internal sampleBatchId2 = keccak256("batch-0002");
    bytes32 internal sampleRoot1 = 0x7c4f9a1e3b5d8c2e0f6a4b1d9c7e5a3f2b8d0c6e4a1b9f7d5c3e1a8b6d4f2c0e;
    bytes32 internal sampleRoot2 = 0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff;

    event BatchCommitted(
        bytes32 indexed batchId,
        bytes32 indexed merkleRoot,
        uint32 leafCount,
        address indexed submitter,
        uint64 timestamp
    );

    function setUp() public {
        vm.label(admin, "Admin");
        vm.label(submitter, "Submitter");
        vm.label(unauthorized, "Unauthorized");

        tracker = new ProductStageTracker(admin);

        // Grant submitter role to `submitter` address
        vm.prank(admin);
        tracker.grantRole(tracker.ROOT_SUBMITTER_ROLE(), submitter);
    }

    // ─── 1. Deployment & Constructor Tests ────────────────────────────────────────

    function test_ConstructorRevertsOnZeroAdmin() public {
        vm.expectRevert(ProductStageTracker.InvalidAdminAddress.selector);
        new ProductStageTracker(address(0));
    }

    function test_InitialRolesAssignedToAdmin() public {
        assertTrue(tracker.hasRole(tracker.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(tracker.hasRole(tracker.ROOT_SUBMITTER_ROLE(), admin));
    }

    // ─── 2. Authorised Root Submission ───────────────────────────────────────────

    function test_AuthorisedRootSubmission() public {
        uint64 fakeTimestamp = 1770000000;
        vm.warp(fakeTimestamp);

        vm.prank(submitter);
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 150);

        assertTrue(tracker.isBatchCommitted(sampleBatchId1));
        assertEq(tracker.getBatchCount(), 1);
        assertEq(tracker.getBatchIdAtIndex(0), sampleBatchId1);

        ProductStageTracker.BatchCommitment memory commitment = tracker.getBatch(sampleBatchId1);
        assertEq(commitment.batchId, sampleBatchId1);
        assertEq(commitment.merkleRoot, sampleRoot1);
        assertEq(commitment.leafCount, 150);
        assertEq(commitment.committedAt, fakeTimestamp);
        assertEq(commitment.submitter, submitter);
    }

    // ─── 3. Unauthorised Root Submission ─────────────────────────────────────────

    function test_UnauthorisedRootSubmissionReverts() public {
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                tracker.ROOT_SUBMITTER_ROLE()
            )
        );
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 50);

        assertFalse(tracker.isBatchCommitted(sampleBatchId1));
        assertEq(tracker.getBatchCount(), 0);
    }

    // ─── 4. Zero or Invalid Inputs ───────────────────────────────────────────────

    function test_RevertOnZeroBatchId() public {
        vm.prank(submitter);
        vm.expectRevert(ProductStageTracker.InvalidBatchId.selector);
        tracker.commitBatch(bytes32(0), sampleRoot1, 100);
    }

    function test_RevertOnZeroMerkleRoot() public {
        vm.prank(submitter);
        vm.expectRevert(ProductStageTracker.InvalidMerkleRoot.selector);
        tracker.commitBatch(sampleBatchId1, bytes32(0), 100);
    }

    function test_RevertOnZeroLeafCount() public {
        vm.prank(submitter);
        vm.expectRevert(ProductStageTracker.InvalidLeafCount.selector);
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 0);
    }

    // ─── 5. Duplicate Batch ID Protection ────────────────────────────────────────

    function test_DuplicateBatchIdsRevert() public {
        vm.prank(submitter);
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 10);

        // Attempting to commit the same batch ID again must revert
        vm.prank(submitter);
        vm.expectRevert(abi.encodeWithSelector(ProductStageTracker.BatchAlreadyExists.selector, sampleBatchId1));
        tracker.commitBatch(sampleBatchId1, sampleRoot2, 20);

        // Batch count remains 1
        assertEq(tracker.getBatchCount(), 1);
    }

    // ─── 6. Batch Retrieval Functions ───────────────────────────────────────────

    function test_RetrievalOfExistingBatches() public {
        vm.prank(submitter);
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 10);

        vm.prank(submitter);
        tracker.commitBatch(sampleBatchId2, sampleRoot2, 25);

        assertEq(tracker.getBatchCount(), 2);
        assertEq(tracker.getBatchIdAtIndex(0), sampleBatchId1);
        assertEq(tracker.getBatchIdAtIndex(1), sampleBatchId2);

        ProductStageTracker.BatchCommitment memory b1 = tracker.getBatch(sampleBatchId1);
        ProductStageTracker.BatchCommitment memory b2 = tracker.getBatch(sampleBatchId2);

        assertEq(b1.leafCount, 10);
        assertEq(b2.leafCount, 25);
    }

    function test_RetrievalOfUnknownBatchesReverts() public {
        bytes32 unknownBatch = keccak256("unknown-batch");

        vm.expectRevert(abi.encodeWithSelector(ProductStageTracker.BatchNotFound.selector, unknownBatch));
        tracker.getBatch(unknownBatch);

        assertFalse(tracker.isBatchCommitted(unknownBatch));
    }

    function test_RetrievalOfOutOfRangeIndexReverts() public {
        vm.expectRevert(abi.encodeWithSelector(ProductStageTracker.BatchNotFound.selector, bytes32(uint256(0))));
        tracker.getBatchIdAtIndex(0);
    }

    // ─── 7. Event Emission ───────────────────────────────────────────────────────

    function test_EventEmissionOnCommit() public {
        uint64 fakeTimestamp = 1770000500;
        vm.warp(fakeTimestamp);

        vm.expectEmit(true, true, false, true, address(tracker));
        emit BatchCommitted(sampleBatchId1, sampleRoot1, 42, submitter, fakeTimestamp);

        vm.prank(submitter);
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 42);
    }

    // ─── 8. Access Control Administration ───────────────────────────────────────

    function test_AdminCanGrantAndRevokeSubmitterRole() public {
        address newSubmitter = address(0xCAFE);

        assertFalse(tracker.hasRole(tracker.ROOT_SUBMITTER_ROLE(), newSubmitter));

        // Admin grants role
        vm.prank(admin);
        tracker.grantRole(tracker.ROOT_SUBMITTER_ROLE(), newSubmitter);
        assertTrue(tracker.hasRole(tracker.ROOT_SUBMITTER_ROLE(), newSubmitter));

        // New submitter can commit
        vm.prank(newSubmitter);
        tracker.commitBatch(sampleBatchId1, sampleRoot1, 5);
        assertTrue(tracker.isBatchCommitted(sampleBatchId1));

        // Admin revokes role
        vm.prank(admin);
        tracker.revokeRole(tracker.ROOT_SUBMITTER_ROLE(), newSubmitter);
        assertFalse(tracker.hasRole(tracker.ROOT_SUBMITTER_ROLE(), newSubmitter));

        // New submitter can no longer commit
        vm.prank(newSubmitter);
        vm.expectRevert();
        tracker.commitBatch(sampleBatchId2, sampleRoot2, 5);
    }

    function test_NonAdminCannotGrantRole() public {
        address stranger = address(0x1234);

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                tracker.DEFAULT_ADMIN_ROLE()
            )
        );
        tracker.grantRole(tracker.ROOT_SUBMITTER_ROLE(), stranger);
    }
}

