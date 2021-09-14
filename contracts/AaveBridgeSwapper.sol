//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";

contract AaveBridgeSwapper is ZkSyncBridgeSwapper {

    constructor (address _zkSync, address _l2Account) ZkSyncBridgeSwapper(_zkSync, _l2Account) {

    }

    // exchanges between ETH and stETH
    function exchange(uint256 _indexIn, uint256 _indexOut, uint256 _amountIn) external override returns (uint256) {
        revert("Not implemented");
    }
}
