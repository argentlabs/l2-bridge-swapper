//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";
import "./interfaces/IGroController.sol";
import "./interfaces/IGroToken.sol";
import "./interfaces/IGroDepositHandler.sol";
import "./interfaces/IGroWithdrawHandler.sol";
import "./interfaces/IGroBuoy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Exchanges a stablecoin for Gro Vault LP tokens.
 * Example indexes:
 * 0: DAI
 * 1: GVT
 */
contract GroBridgeSwapper is ZkSyncBridgeSwapper {

    address public immutable depositHandler;
    address public immutable withdrawHandler;
    address public immutable stablecoin;
    uint256 public immutable stablecoinIndex;
    address public immutable gvt;
    address public immutable buoy;
    address public immutable groReferral;

    constructor(
        address _zkSync,
        address _l2Account,
        address _groController,
        uint256 _stablecoinIndex,
        address _groReferral
    )
        ZkSyncBridgeSwapper(_zkSync, _l2Account)
    {
        require(_groController != address(0), "null _groController");
        IGroController controller = IGroController(_groController);

        require(_stablecoinIndex < 3, "invalid _stablecoinIndex");
        address _stablecoin;
        if (_stablecoinIndex == 0) {
            _stablecoin = controller.DAI();
        } else if (_stablecoinIndex == 1) {
            _stablecoin = controller.USDC();
        } else if (_stablecoinIndex == 2) {
            _stablecoin = controller.USDT();
        } else {
            revert("invalid _stablecoinIndex");
        }
        stablecoin = _stablecoin;
        stablecoinIndex = _stablecoinIndex;
        depositHandler = controller.depositHandler();
        withdrawHandler = controller.withdrawHandler();
        gvt = controller.gvt();
        buoy = controller.buoy();
        groReferral = _groReferral;
    }

    function exchange(uint256 _indexIn, uint256 _indexOut, uint256 _amountIn) external override returns (uint256 amountOut) {
        require(_indexIn + _indexOut == 1, "invalid indexes");

        if (_indexIn == 0) {
            transferFromZkSync(stablecoin);
            amountOut = swapStablecoinForGvt(_amountIn);
            transferToZkSync(gvt, amountOut);
            emit Swapped(stablecoin, _amountIn, gvt, amountOut);
        } else {
            transferFromZkSync(gvt);
            amountOut = swapGvtForStablecoin(_amountIn);
            transferToZkSync(stablecoin, amountOut);
            emit Swapped(gvt, _amountIn, stablecoin, amountOut);
        }
    }

    function swapStablecoinForGvt(uint256 _amountIn) public returns (uint256) {
        uint256[3] memory inAmounts = [uint256(0), 0, 0];
        inAmounts[stablecoinIndex] = _amountIn;

        IGroToken(gvt).approve(address(depositHandler), _amountIn);
        uint256 minLpAmount = getMinAmountOut(IGroBuoy(buoy).stableToLp(inAmounts, true));
        IGroDepositHandler(depositHandler).depositGvt(inAmounts, minLpAmount, groReferral);

        return IGroToken(gvt).balanceOf(address(this));
    }

    function swapGvtForStablecoin(uint256 _amountIn) public returns (uint256) {
        uint256 usdAmount = IGroToken(gvt).getShareAssets(_amountIn);
        uint256 lpAmount = IGroBuoy(buoy).usdToLp(usdAmount);
        uint256 stableAmount = IGroBuoy(buoy).singleStableFromUsd(usdAmount, int128(uint128(stablecoinIndex)));
        uint256 minAmount = getMinAmountOut(stableAmount);
        IGroWithdrawHandler(withdrawHandler).withdrawByStablecoin(false, stablecoinIndex, lpAmount, minAmount);

        return IERC20(stablecoin).balanceOf(address(this));
    }

    function tokens(uint256 index) external view returns (address) {
        if (index == 0) {
            return stablecoin;
        } else {
            return gvt;
        }
    }
}
