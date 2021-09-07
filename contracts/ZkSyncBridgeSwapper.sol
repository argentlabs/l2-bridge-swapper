//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IZkSync.sol";
import "./interfaces/IWstETH.sol";
import "./interfaces/ILido.sol";
import "./interfaces/ICurvePool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZkSyncBridgeSwapper {

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

    address constant internal ETH_TOKEN = address(0);

    event Swapped(address _in, uint256 _amountIn, address _out, uint256 _amountOut);

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
    }
    
    /**
    * @dev Withdraws wrapped stETH from the ZkSync bridge, unwrap it to stETH,
    * swap the stETH for ETH on Curve, and deposits the ETH back to the bridge.
    * @param _amountIn The amount of wrapped stETH to withdraw from ZkSync
    * @param _minAmountOut The minimum amount of ETH to receive and deposit back to ZkSync
    */
    function swapStEthForEth(uint256 _amountIn, uint256 _minAmountOut) external returns (uint256) {
        // withdraw wrapped stEth from the L2 bridge
        IZkSync(zkSync).withdrawPendingBalance(payable(address(this)), wStEth, toUint128(_amountIn));
        // unwrap to stEth
        uint256 unwrapped = IWstETH(wStEth).unwrap(_amountIn);
        // swap stEth for ETH on Curve
        uint256 amountOut = ICurvePool(stEthPool).exchange(1, 0, unwrapped, _minAmountOut);
        // redundant but this way we don't rely on Curve for the check
        require (amountOut >= _minAmountOut, "out too small");
        // deposit Eth to L2 bridge
        IZkSync(zkSync).depositETH{value: amountOut}(l2Account);
        // emit event
        emit Swapped(wStEth, _amountIn, ETH_TOKEN, amountOut);
        // return deposited amount
        return amountOut;
    }

    /**
    * @dev Withdraws ETH from ZkSync bridge, swap it for stETH, wrap it, and deposit the wrapped stETH back to the bridge.
    * @param _amountIn The amount of ETH to withdraw from ZkSync
    * @param _minAmountOut The minimum amount of stETH to receive and deposit back to ZkSync
    */
    function swapEthForStEth(uint256 _amountIn, uint256 _minAmountOut) external returns (uint256) {
        // withdraw Eth from the L2 bridge
        IZkSync(zkSync).withdrawPendingBalance(payable(address(this)), address(0), toUint128(_amountIn));
        // swap Eth for stEth on the Lido contract
        ILido(stEth).submit{value: _amountIn}(lidoReferal);
        // approve the wStEth contract to take the stEth
        IERC20(stEth).approve(wStEth, _amountIn);
        // wrap to wStEth
        uint256 amountOut = IWstETH(wStEth).wrap(_amountIn);
        // not needed, but we still check that we have received enough Eth
        require (amountOut >= _minAmountOut, "out too small");
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
    * @dev Safety method to recover ERC20 tokens that are sent to the contract by error.
    * The tokens are recovered by deposting them to the l2Account on zkSync.
    * @param _token The token to recover. Must be a token supported by ZkSync.
    */
    function recoverToken(address _token) external returns (uint256) {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        address token = _token;
        if (token == stEth) {
            // wrap to wStEth
            IERC20(stEth).approve(wStEth, balance);
            balance = IWstETH(wStEth).wrap(balance);
            token = wStEth;
        }
        // approve the zkSync bridge to take the token
        IERC20(token).approve(zkSync, balance);
        // deposit the token to the L2 bridge
        IZkSync(zkSync).depositERC20(IERC20(token), toUint104(balance), l2Account);
        // return deposited amount
        return balance;
    }

    /**
     * @dev fallback method to make sure we can receive ETH from ZkSync or Curve.
     */
    receive() external payable {
        require(msg.sender == zkSync || msg.sender == stEthPool, "no ETH transfer");
    }

    /**
     * @dev Returns the downcasted uint128 from uint256, reverting on
     * overflow (when the input is greater than largest uint128).
     */
    function toUint128(uint256 value) internal pure returns (uint128) {
        require(value <= type(uint128).max, "SafeCast: value doesn't fit in 128 bits");
        return uint128(value);
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
