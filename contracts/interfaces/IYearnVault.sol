//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

interface IYearnVault {
    function token() external returns (address);

    function deposit(uint256 _amount) external returns (uint256);
    function withdraw(uint256 _maxShares) external returns (uint256);
}
