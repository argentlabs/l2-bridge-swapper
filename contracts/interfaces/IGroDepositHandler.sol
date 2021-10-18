//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

interface IGroDepositHandler {

    function DAI() external view returns (address);
    function USDC() external view returns (address);
    function USDT() external view returns (address);
    
    function depositGvt(
        uint256[3] calldata inAmounts,
        uint256 minAmount,
        address referral
    ) external;

    function depositPwrd(
        uint256[3] calldata inAmounts,
        uint256 minAmount,
        address referral
    ) external;
}