//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ILido {
    function submit(address _referral) external payable returns (uint256);
}