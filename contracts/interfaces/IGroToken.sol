//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGroToken is IERC20 {
    function pricePerShare() external view returns (uint256);
}