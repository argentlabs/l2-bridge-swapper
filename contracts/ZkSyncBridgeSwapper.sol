//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IZkSync.sol";
import "./interfaces/IWstETH.sol";
import "./interfaces/ILido.sol";
import "./interfaces/ICurvePool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ZkSyncBridgeSwapper {

    using SafeMath for uint256;

    // The owner of the contract
    address public owner;

    // The ZkSync bridge contract
    address public immutable zkSync;
    // The L2 market maker account
    address public immutable l2Account;
    // The address of the stEth token
    address public immutable stEth;
    // The address of the wrapped stEth token
    address public immutable wStEth;
    // The address of the stEth/Eth Curve pool
    address public immutable stEthPool;
    // The referal address for Lido
    address public immutable lidoReferal;

    // The max slippage accepted in Curve. Set to 1%.
    uint256 public immutable SLIPPAGE_FACTOR = 99000000;

    address constant internal ETH_TOKEN = address(0);

    event Swapped(address _in, uint256 _amountIn, address _out, uint256 _amountOut);
    event OwnerChanged(address _owner, address _newOwner);

    constructor (
        address _zkSync,
        address _l2Account,
        address _wStEth,
        address _stEthPool,
        address _lidoReferal
    )
    {
        zkSync = _zkSync;
        l2Account = _l2Account;
        wStEth = _wStEth;
        stEth = IWstETH(_wStEth).stETH();
        stEthPool = _stEthPool;
        lidoReferal =_lidoReferal;
        owner = msg.sender;
    }
    
    /**
    * @dev Swaps wrapped stETH for ETH and deposits the resulting ETH to the ZkSync bridge.
    * First withdraws wrapped stETH from the bridge if there is a pending balance.
    * @param _amountIn The amount of wrapped stETH to swap.
    */
    function swapStEthForEth(uint256 _amountIn) external returns (uint256) {
        // check if there is a pending balance to withdraw
        uint128 pendingBalance = IZkSync(zkSync).getPendingBalance(address(this), wStEth);
        if (pendingBalance > 0) {
            // withdraw pending balance
            IZkSync(zkSync).withdrawPendingBalance(payable(address(this)), wStEth, pendingBalance);
        }
        // unwrap to stEth
        uint256 unwrapped = IWstETH(wStEth).unwrap(_amountIn);
        // swap stEth for ETH on Curve
        uint256 amountOut = ICurvePool(stEthPool).exchange(1, 0, unwrapped, getMinAmountOut(unwrapped));
        // deposit Eth to L2 bridge
        IZkSync(zkSync).depositETH{value: amountOut}(l2Account);
        // emit event
        emit Swapped(wStEth, _amountIn, ETH_TOKEN, amountOut);
        // return deposited amount
        return amountOut;
    }

    /**
    * @dev Swaps ETH for wrapped stETH and deposits the resulting wstETH to the ZkSync bridge.
    * First withdraws ETH from the bridge if there is a pending balance.
    * @param _amountIn The amount of ETH to swap.
    */
    function swapEthForStEth(uint256 _amountIn) external returns (uint256) {
        // check if there is a pending balance to withdraw
        uint128 pendingBalance = IZkSync(zkSync).getPendingBalance(address(this), address(0));
        if (pendingBalance > 0) {
            // withdraw Eth from the L2 bridge
            IZkSync(zkSync).withdrawPendingBalance(payable(address(this)), address(0), pendingBalance);
        }
        // swap Eth for stEth on the Lido contract
        ILido(stEth).submit{value: _amountIn}(lidoReferal);
        // approve the wStEth contract to take the stEth
        IERC20(stEth).approve(wStEth, _amountIn);
        // wrap to wStEth
        uint256 amountOut = IWstETH(wStEth).wrap(_amountIn);
        // approve the zkSync bridge to take the wrapped stEth
        IERC20(wStEth).approve(zkSync, amountOut);
        // deposit the wStEth to the L2 bridge
        IZkSync(zkSync).depositERC20(IERC20(wStEth), toUint104(amountOut), l2Account);
        // emit event
        emit Swapped(ETH_TOKEN, _amountIn, wStEth, amountOut);
        // return deposited amount
        return amountOut;
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

    function changeOwner(address _newOwner) external {
        require(msg.sender == owner, "unauthorised");
        require(_newOwner != address(0), "invalid input");
        owner = _newOwner;
        emit OwnerChanged(owner, _newOwner);
    }

    /**
     * @dev fallback method to make sure we can receive ETH
     */
    receive() external payable {
        
    }

    /**
     * @dev Returns the minimum accepted out amount.
     */
    function getMinAmountOut(uint256 _amountIn) internal pure returns (uint256) {
        return _amountIn.mul(SLIPPAGE_FACTOR).div(100000000);
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
