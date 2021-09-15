//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/ICurvePool.sol";
import "./LidoMock.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CurvePoolMock is ICurvePool {

    address stETH;

    constructor (address _stETH) {
        stETH = _stETH;
    }

    receive() external payable {}

    // exchanges stETH for ETH with a ration of 1:1
    function exchange(int128 _i, int128 _j, uint256 _dx, uint256 _min_dy) external override returns (uint256) {
        require(_i == 1 && _j == 0, "invalid i,j parameters");
        require(_dx > _min_dy, "dy too low");
        LidoMock(stETH).burn(msg.sender, _dx);
        (bool success, ) = msg.sender.call{value: _dx}("");
        require(success, "failed to send ETH");
        return _dx;
    }
}