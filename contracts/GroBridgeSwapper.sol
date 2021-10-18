//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";
import "./interfaces/IGroToken.sol";
import "./interfaces/IGroDepositHandler.sol";
import "./interfaces/IGroWithdrawHandler.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
* @notice Exchanges stablecoins for Gro Vault LP tokens.
* Example indexes:
* 0: DAI
* 1: GVT
*/
contract GroBridgeSwapper is ZkSyncBridgeSwapper {

    address public immutable stablecoin;
    uint256 public immutable stablecoinIndex;
    address public immutable gvt;
    address public immutable depositHandler;
    address public immutable withdrawHandler;
    address public immutable groReferral;

    address[2] public tokens;

    constructor(
        address _zkSync,
        address _l2Account,
        address _depositHandler,
        address _withdrawHandler,
        uint256 _stablecoinIndex,
        address _gvt,
        address _groReferral
    )
        ZkSyncBridgeSwapper(_zkSync, _l2Account)
    {
        require(_gvt != address(0), "null _gvt");
        require(_depositHandler != address(0), "null _depositHandler");
        require(_withdrawHandler != address(0), "null _withdrawHandler");

        address _stablecoin;
        if (_stablecoinIndex == 0) {
            _stablecoin = IGroDepositHandler(_depositHandler).DAI();
        } else if (_stablecoinIndex == 1) {
            _stablecoin = IGroDepositHandler(_depositHandler).USDC();
        } else if (_stablecoinIndex == 2) {
            _stablecoin = IGroDepositHandler(_depositHandler).USDT();
        } else {
            revert("invalid stablecoin");
        }
        stablecoin = _stablecoin;
        stablecoinIndex = _stablecoinIndex;
        gvt = _gvt;

        depositHandler = _depositHandler;
        withdrawHandler = _withdrawHandler;
        groReferral = _groReferral;
        tokens = [_stablecoin, _gvt];
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
        uint256 minLpAmount = getMinAmountOut((1 ether * _amountIn) / IGroToken(gvt).pricePerShare());
        IGroDepositHandler(depositHandler).depositGvt(inAmounts, minLpAmount, groReferral);

        return IGroToken(gvt).balanceOf(address(this));
    }

    function swapGvtForStablecoin(uint256 _amountIn) public returns (uint256) {
        uint256 minAmount = getMinAmountOut(_amountIn * IGroToken(gvt).pricePerShare() / 1 ether);
        IGroWithdrawHandler(withdrawHandler).withdrawByStablecoin(false, stablecoinIndex, _amountIn, minAmount);

        return IERC20(stablecoin).balanceOf(address(this));
    }
}
