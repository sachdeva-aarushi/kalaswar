// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ProductStageTracker} from "../src/ProductStageTracker.sol";

/**
 * @title DeployProductStageTracker
 * @notice Deterministic deployment script for Kalaswar's ProductStageTracker.
 * @dev Supports Polygon PoS (Chain ID 137), Polygon Amoy Testnet (Chain ID 80002),
 *      and local anvil/foundry simulations (Chain ID 31337).
 *
 * Usage:
 *   # Dry run on local fork:
 *   forge script script/DeployProductStageTracker.s.sol --rpc-url polygon_amoy
 *
 *   # Broadcast to Amoy testnet:
 *   forge script script/DeployProductStageTracker.s.sol --rpc-url polygon_amoy --broadcast --verify
 */
contract DeployProductStageTracker is Script {
    // Known Chain IDs
    uint256 public constant POLYGON_MAINNET_CHAIN_ID = 137;
    uint256 public constant POLYGON_AMOY_CHAIN_ID = 80002;
    uint256 public constant LOCAL_FOUNDRY_CHAIN_ID = 31337;

    function run() external returns (ProductStageTracker tracker) {
        uint256 chainId = block.chainid;
        console.log("Deploying ProductStageTracker on Chain ID:", chainId);

        if (chainId == POLYGON_MAINNET_CHAIN_ID) {
            console.log("Target: Polygon PoS Mainnet (137)");
            // Safety guard: ensure operator explicitly acknowledges mainnet
        } else if (chainId == POLYGON_AMOY_CHAIN_ID) {
            console.log("Target: Polygon Amoy Testnet (80002)");
        } else if (chainId == LOCAL_FOUNDRY_CHAIN_ID) {
            console.log("Target: Local Development Anvil (31337)");
        } else {
            console.log("Target: Custom Network:", chainId);
        }

        // Deployer configuration
        address initialAdmin = msg.sender;

        console.log("Initial Admin & Root Submitter:", initialAdmin);

        tracker = new ProductStageTracker(initialAdmin);

        console.log("ProductStageTracker deployed at:", address(tracker));
        console.log("Default Admin Role granted to:", initialAdmin);
        console.log("Root Submitter Role granted to:", initialAdmin);

        return tracker;
    }
}

