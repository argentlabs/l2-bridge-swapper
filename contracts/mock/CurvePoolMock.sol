//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/ICurvePool.sol";
import "./LidoMock.sol";
import "./ERC20MintableBurnable.sol";

contract CurvePoolMock is ICurvePool {

    address public stETH;
    address[2] public override coins;
    address public override lp_token;

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
        require(mintAmount > _minMintAmount, "slippage");
        ERC20MintableBurnable(lp_token).mint(msg.sender, mintAmount);
    }

    function remove_liquidity(uint256 _amount, uint256[2] calldata _minAmounts) external payable override returns (uint256[2] memory amounts) {
        ERC20MintableBurnable(lp_token).burn(msg.sender, _amount);
        uint256 ethAmount = _amount / 2;
        uint256 stEthAmount = _amount - ethAmount;
        require(address(this).balance >= ethAmount, "not enough ETH");
        require(ethAmount >= _minAmounts[0], "ETH slippage");
        require(stEthAmount >= _minAmounts[1], "stETH slippage");
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "failed to send ETH");
        LidoMock(stETH).mint(msg.sender, stEthAmount);
        return [ethAmount, stEthAmount];
    }
}