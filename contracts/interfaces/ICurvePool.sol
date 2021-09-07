//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ICurvePool {
    function exchange(int128 _i, int128 _j, uint256 _dx, uint256 _min_dy) external returns (uint256);
}