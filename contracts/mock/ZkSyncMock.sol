//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "../interfaces/IZkSync.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZKSyncMock is IZkSync {

    // ETH deposited
    mapping (address => uint256) ethBalances;
    // token deposited (owner => token => balance)
    mapping (address => mapping (address => uint256)) tokenBalances;
    // pending balances (owner => token => balance)
    mapping (address => mapping (address => uint128)) pendingBalances;

    receive() external payable {}

    function withdrawPendingBalance(address payable _owner, address _token, uint128 _amount) external override {
        if (_token == address(0)) {
            uint256 balance = address(this).balance;
            require(_amount <= balance, "not enough ETH to withdraw");
            pendingBalances[_owner][_token] = 0;
            (bool success, ) = _owner.call{value: _amount}("");
            require(success, "withdraw failed");
        } else {
            uint256 balance = IERC20(_token).balanceOf(address(this));
            require(_amount <= balance, "not enough token to withdraw");
            pendingBalances[_owner][_token] = 0;
            IERC20(_token).transfer(_owner, _amount);
        }
    }

    function depositETH(address _zkSyncAddress) external override payable {
        ethBalances[_zkSyncAddress] += msg.value;
    }

    function depositERC20(IERC20 _token, uint104 _amount, address _zkSyncAddress) external override {
        _token.transferFrom(msg.sender, address(this), _amount);
        tokenBalances[_zkSyncAddress][address(_token)] += _amount;
    }

    function setPendingBalance(address _token, uint128 _amount) external {
        pendingBalances[msg.sender][_token] = _amount;
    }

    function getPendingBalance(address _address, address _token) public override view returns (uint128) {
        return pendingBalances[_address][_token];
    }

    function getDepositedETH(address _zkSyncAddress) external view returns(uint256) {
        return ethBalances[_zkSyncAddress];
    }

    function getDepositedERC20(IERC20 _token, address _zkSyncAddress) external view returns(uint256) {
        return tokenBalances[_zkSyncAddress][address(_token)];
    }
}