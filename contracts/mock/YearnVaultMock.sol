//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/IYearnVault.sol";
import "./ERC20MintableBurnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract YearnVaultMock is IYearnVault, ERC20MintableBurnable {

    address public override token;
    uint256 public override pricePerShare = 1;

    constructor(address _token) ERC20MintableBurnable("Yearn Vault Token", "yvXXX") {
        token = _token;
    }

    function deposit(uint256 _amount) external override returns (uint256) {
        require(_amount > 0, "YearnVault: can't wrap zero tokens");
        uint256 yvTokenAmount = _amount; // we use a 1:1 ratio to keep it simple
        _mint(msg.sender, yvTokenAmount);
        IERC20(token).transferFrom(msg.sender, address(this), _amount);
        return yvTokenAmount;
    }

    function withdraw(uint256 _yvTokenAmount) external override returns (uint256) {
        require(_yvTokenAmount > 0, "YearnVault: zero amount unwrap not allowed");
        uint256 amount = _yvTokenAmount; // we use a 1:1 ratio to keep it simple
        _burn(msg.sender, _yvTokenAmount);
        IERC20(token).transfer(msg.sender, amount);
        return amount;
    }
}
