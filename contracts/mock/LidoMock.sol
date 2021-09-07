//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/ILido.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LidoMock is ILido, ERC20 {

    constructor () ERC20("staked Ether 2.0", "stETH") {

    }

    function submit(address /*_referral*/) external payable override returns (uint256) {
        _mint(msg.sender, msg.value);
        return msg.value;
    }

    function mint(address _recipient, uint256 _amount) external {
        _mint(_recipient, _amount);
    }

    function burn(address _sender, uint256 _amount) external {
        _burn(_sender, _amount);
    }
}