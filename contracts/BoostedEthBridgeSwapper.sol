//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";
import "./interfaces/ILido.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/IYearnVault.sol";

/**
* @notice Exchanges Eth for the "Yearn vault Curve pool staked Eth" token.
* Indexes:
* 0: Eth
* 1: yvCrvStEth
*/
contract BoostedEthBridgeSwapper is ZkSyncBridgeSwapper {

    address public immutable stEth;
    address public crvStEth;
    address public immutable yvCrvStEth;

    ICurvePool public stEthPool;
    address public immutable lidoReferral;
    address[2] public tokens;

    constructor(
        address _zkSync,
        address _l2Account,
        address _yvCrvStEth,
        address _stEthPool,
        address _lidoReferral
    )
        ZkSyncBridgeSwapper(_zkSync, _l2Account)
    {
        require(_yvCrvStEth != address(0), "null _yvCrvStEth");
        yvCrvStEth = _yvCrvStEth;
        crvStEth = IYearnVault(_yvCrvStEth).token();
        require(crvStEth != address(0), "null crvStEth");

        require(_stEthPool != address(0), "null _stEthPool");
        stEthPool = ICurvePool(_stEthPool);

        require(crvStEth == stEthPool.lp_token(), "crvStEth mismatch");
        stEth = stEthPool.coins(1);
        lidoReferral = _lidoReferral;
        tokens = [ETH_TOKEN, _yvCrvStEth];
    }

    function exchange(uint256 _indexIn, uint256 _indexOut, uint256 _amountIn) external override returns (uint256 amountOut) {
        require(_indexIn + _indexOut == 1, "invalid indexes");


        if (_indexIn == 0) {
            transferFromZkSync(ETH_TOKEN);
            amountOut = exchangeETHforYVCRV(_amountIn)
            transferToZkSync(yvCrvStEth, amountOut);
            emit Swapped(ETH_TOKEN, _amountIn, yvCrvStEth, amountOut);
        } else {
            transferFromZkSync(yvCrvStEth);
            amountOut = exchangeYVCRVforETH(_amountIn)
            transferToZkSync(ETH_TOKEN, amountOut);
            emit Swapped(yvCrvStEth, _amountIn, ETH_TOKEN, amountOut);
        }
    }
}
