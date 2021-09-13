//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

interface IBridgeSwapper {
    event Swapped(address _in, uint256 _amountIn, address _out, uint256 _amountOut);

    /**
    * @notice Perform an exchange between two coins
    * @dev Index values can be found via the `coins` public getter method
    * @param _indexIn Index value for the coin to send
    * @param _indexOut Index valie of the coin to receive
    * @param _amountIn Amount of `_indexIn` being exchanged
    * @return Actual amount of `_indexOut` received
    */
    function exchange(int128 _indexIn, int128 _indexOut, uint256 _amountIn) external returns (uint256);
}
