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
        lidoReferral =_lidoReferral;
    }

    function exchange(uint256 _indexIn, uint256 _indexOut, uint256 _amountIn) external override returns (uint256 amountOut) {
        require(_indexIn < 2, "invalid input index");
        require(_indexOut < 2 && _indexOut != _indexIn, "invalid output index");

        address inputToken = _indexIn == 0 ? ETH_TOKEN : yvCrvStEth;
        address outputToken = _indexOut == 0 ? ETH_TOKEN : yvCrvStEth;

        transferFromZkSync(inputToken);

        if (_indexIn == 0) { // deposit
            uint256 ethAmount = _amountIn / 2;
            uint256 stEthAmount = _amountIn - ethAmount;

            ILido(stEth).submit{value: stEthAmount}(lidoReferral);

            IERC20(stEth).approve(address(stEthPool), stEthAmount);
            uint256 crvStEthAmount = stEthPool.add_liquidity{value: ethAmount}([ethAmount, stEthAmount], 1);

            IERC20(crvStEth).approve(yvCrvStEth, crvStEthAmount);
            amountOut = IYearnVault(yvCrvStEth).deposit(crvStEthAmount);
        } else { // withdrawal
            uint256 crvStEthAmount = IYearnVault(yvCrvStEth).withdraw(_amountIn);

            uint256[2] memory minAmounts = stEthPool.remove_liquidity(crvStEthAmount, [uint256(1), 1]);

            uint256 ethAmount = stEthPool.exchange(1, 0, minAmounts[1], getMinAmountOut(minAmounts[1]));

            amountOut = minAmounts[0] + ethAmount;
        }

        transferToZkSync(inputToken, _amountIn, outputToken, amountOut);
    }

    function tokens(uint256 index) public view returns (address) {
        require(index < 2, "only 2 tokens");
        return index == 0 ? ETH_TOKEN : yvCrvStEth;
    }
}
