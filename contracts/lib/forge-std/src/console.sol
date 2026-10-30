// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library console {
    address constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);

    function log(string memory p0) internal view {
        (bool ok, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string)", p0));
        ok;
    }

    function log(string memory p0, address p1) internal view {
        (bool ok, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address)", p0, p1));
        ok;
    }

    function log(string memory p0, uint256 p1) internal view {
        (bool ok, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256)", p0, p1));
        ok;
    }
}

