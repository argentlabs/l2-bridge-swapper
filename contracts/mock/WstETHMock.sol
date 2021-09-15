//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/IWstETH.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WstETHMock is IWstETH, ERC20 {

    address public override stETH;

    constructor(address _stETH) ERC20("Wrapped liquid staked Ether 2.0", "wstETH") {
        stETH = _stETH;
    }

    function wrap(uint256 _stETHAmount) external override returns (uint256) {
        require(_stETHAmount > 0, "wstETH: can't wrap zero stETH");
        uint256 wstETHAmount = _stETHAmount; // we use a 1:1 ratio to keep it simple
        _mint(msg.sender, wstETHAmount);
        IERC20(stETH).transferFrom(msg.sender, address(this), _stETHAmount);
        return wstETHAmount;
    }

    function unwrap(uint256 _wstETHAmount) external override returns (uint256) {
        require(_wstETHAmount > 0, "wstETH: zero amount unwrap not allowed");
        uint256 stETHAmount = _wstETHAmount; // we use a 1:1 ratio to keep it simple
        _burn(msg.sender, _wstETHAmount);
        IERC20(stETH).transfer(msg.sender, stETHAmount);
        return stETHAmount;
    }
}