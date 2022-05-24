//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/ICurvePool.sol";
import "./LidoMock.sol";
import "./ERC20MintableBurnable.sol";

contract CurvePoolMock is ICurvePool {

    address public stETH;
    address[2] public override coins;
    address public override lp_token;
    uint256 public override get_virtual_price = 1 ether;

    constructor(address _stETH, address _lpToken) {
        stETH = _stETH;
        lp_token = _lpToken;
        coins = [address(0), stETH];
    }

    receive() external payable {}

    // exchanges stETH for ETH with a ration of 1:1
    function exchange(int128 _i, int128 _j, uint256 _dx, uint256 _minDy) external override returns (uint256) {
        require(_i == 1 && _j == 0, "invalid i,j parameters");
        require(_dx > _minDy, "dy too low");
        LidoMock(stETH).burn(msg.sender, _dx);
        (bool success, ) = msg.sender.call{value: _dx}("");
        require(success, "failed to send ETH");
        return _dx;
    }

    function add_liquidity(uint256[2] calldata _amounts, uint256 _minMintAmount) external payable override returns (uint256 mintAmount) {
        require(_amounts[0] == msg.value, "value mismatch");
        LidoMock(stETH).burn(msg.sender, _amounts[1]);
        mintAmount = _amounts[0] + _amounts[1];
        require(mintAmount >= _minMintAmount, "slippage");
        ERC20MintableBurnable(lp_token).mint(msg.sender, mintAmount);
    }

    function remove_liquidity_one_coin(uint256 _amount, int128 _i, uint256 _minAmount) external payable override returns (uint256) {
        require(_i == 0, "withdraw ETH only");
        ERC20MintableBurnable(lp_token).burn(msg.sender, _amount);
        require(address(this).balance >= _amount, "not enough ETH");
        require(_amount >= _minAmount, "ETH slippage");
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "failed to send ETH");
        return _amount;
    }

    function calc_withdraw_one_coin(uint256 /*_amount*/, int128 _i) external pure override returns (uint256) {
        require(_i == 0, "withdraw ETH only");
        return 1 ether;
    }

    function calc_token_amount(uint256[2] calldata /*_amounts*/, bool /*_isDeposit*/) external pure override returns (uint256) {
        return 1 ether;
    }
}