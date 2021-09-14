//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./interfaces/IZkSync.sol";
import "./interfaces/IBridgeSwapper.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract ZkSyncBridgeSwapper is IBridgeSwapper {

    // The owner of the contract
    address public owner;
    // The max slippage accepted for swapping. Defaults to 1% with 6 decimals.
    uint256 public slippagePercent = 1e6;

    // The ZkSync bridge contract
    address public immutable zkSync;
    // The L2 market maker account
    address public immutable l2Account;

    address constant internal ETH_TOKEN = address(0);

    event OwnerChanged(address _owner, address _newOwner);
    event SlippageChanged(uint256 _slippagePercent);

    constructor(address _zkSync, address _l2Account) {
        zkSync = _zkSync;
        l2Account = _l2Account;
        owner = msg.sender;
    }

    function changeOwner(address _newOwner) external {
        require(msg.sender == owner, "unauthorised");
        require(_newOwner != address(0), "invalid input");
        owner = _newOwner;
        emit OwnerChanged(owner, _newOwner);
    }

    function changeSlippage(uint256 _slippagePercent) external {
        require(msg.sender == owner, "unauthorised");
        require(_slippagePercent != slippagePercent, "identical input");
        slippagePercent = _slippagePercent;
        emit SlippageChanged(slippagePercent);
    }


    /**
    * @dev Check if there is a pending balance to withdraw in zkSync and withdraw it if applicable.
    * @param _token The token to withdaw.
    */
    function transferZKSyncBalance(address _token) internal {
        uint128 pendingBalance = IZkSync(zkSync).getPendingBalance(address(this), _token);
        if (pendingBalance > 0) {
            IZkSync(zkSync).withdrawPendingBalance(payable(address(this)), _token, pendingBalance);
        }
    }

    /**
    * @dev Safety method to recover ETH or ERC20 tokens that are sent to the contract by error.
    * @param _token The token to recover.
    */
    function recoverToken(address _token) external returns (uint256 balance) {
        bool success;
        if (_token == ETH_TOKEN) {
            balance = address(this).balance;
            (success, ) = owner.call{value: balance}("");
        } else {
            balance = IERC20(_token).balanceOf(address(this));
            success = IERC20(_token).transfer(owner, balance);
        }
        require(success, "failed to recover");
    }

    /**
     * @dev fallback method to make sure we can receive ETH
     */
    receive() external payable {
        
    }

    /**
     * @dev Returns the minimum accepted out amount.
     */
    function getMinAmountOut(uint256 _amountIn) internal view returns (uint256) {
        return _amountIn * (100e6 - slippagePercent) / 100e6;
    }

    /**
     * @dev Returns the downcasted uint104 from uint256, reverting on
     * overflow (when the input is greater than largest uint104).
     */
    function toUint104(uint256 value) internal pure returns (uint104) {
        require(value <= type(uint104).max, "SafeCast: value doesn't fit in 104 bits");
        return uint104(value);
    }
}
