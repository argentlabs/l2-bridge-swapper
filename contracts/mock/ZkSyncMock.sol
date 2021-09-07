//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IZkSync.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZKSyncMock is IZkSync {

    // the L1 address of a token available on L2
    address l2Token;
    // ETH deposited
    mapping (address => uint256) ethBalances;
    // token deposited
    mapping (address => uint256) tokenBalances;

    constructor(address _token) {
        l2Token = _token;
    }

    receive() external payable {}

    function withdrawPendingBalance(address payable _owner, address _token, uint128 _amount) external override {
        if (_token == address(0)) {
            uint256 balance = address(this).balance;
            require(_amount <= balance, "not enough ETH to withdraw");
            (bool success, ) = _owner.call{value: _amount}("");
            require(success, "withdraw failed");
        } else {
            require (_token == l2Token, "wrong token");
            uint256 balance = IERC20(l2Token).balanceOf(address(this));
            require(_amount <= balance, "not enough token to withdraw");
            IERC20(_token).transfer(_owner, _amount);
        }
    }

    function depositETH(address _zkSyncAddress) external override payable {
        ethBalances[_zkSyncAddress] += msg.value;
    }

    function depositERC20(IERC20 _token, uint104 _amount, address _zkSyncAddress) external override {
        require (address(_token) == l2Token, "wrong token");
        _token.transferFrom(msg.sender, address(this), _amount);
        tokenBalances[_zkSyncAddress] += _amount;
    }

    function getDepositedETH(address _zkSyncAddress) external view returns(uint256) {
        return ethBalances[_zkSyncAddress];
    }

    function getDepositedERC20(IERC20 _token, address _zkSyncAddress) external view returns(uint256) {
        require (address(_token) == l2Token, "wrong token");
        return tokenBalances[_zkSyncAddress];
    }
}