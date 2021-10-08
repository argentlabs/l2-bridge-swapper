//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/ILido.sol";
import "../mock/ERC20MintableBurnable.sol";

contract LidoMock is ILido, ERC20MintableBurnable {

    constructor() ERC20MintableBurnable("staked Ether 2.0", "stETH") {}

    function submit(address /*_referral*/) external payable override returns (uint256) {
        _mint(msg.sender, msg.value);
        return msg.value;
    }
}
