//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";
import "./interfaces/IYearnVault.sol";

/**
* @notice Exchanges tokens for their respective yearn vault tokens.
* NOTE: to add a new vault, put the underlying token at the even index,
* immediately followed by the vault token at the odd index.
* Example indexes:
* 0: DAI
* 1: yvDAI
* 2: USDC
* 3: yvUSDC
*/
contract YearnBridgeSwapper is ZkSyncBridgeSwapper {

    address[] public tokens;

    constructor(address _zkSync, address _l2Account, address[] memory _tokens) ZkSyncBridgeSwapper(_zkSync, _l2Account) {
        tokens = _tokens;
    }

    function exchange(uint256 _indexIn, uint256 _indexOut, uint256 _amountIn) external override returns (uint256 amountOut) {
        require(_indexIn < tokens.length, "invalid input index");
        require(_indexOut < tokens.length, "invalid output index");

        address inputToken = tokens[_indexIn];
        address outputToken = tokens[_indexOut];

        transferZKSyncBalance(inputToken);

        if (_indexIn % 2 == 0) { // deposit
            address yvToken = tokens[_indexIn + 1];
            require(outputToken == yvToken, "invalid output token");

            IERC20(inputToken).approve(yvToken, _amountIn);
            amountOut = IYearnVault(yvToken).deposit(_amountIn);
        } else { // withdrawal
            require(outputToken == tokens[_indexIn - 1], "invalid output token");

            amountOut = IYearnVault(inputToken).withdraw(_amountIn);
        }

        // approve the zkSync bridge to take the output token
        IERC20(outputToken).approve(zkSync, amountOut);
        // deposit the output token to the L2 bridge
        IZkSync(zkSync).depositERC20(IERC20(outputToken), toUint104(amountOut), l2Account);

        emit Swapped(inputToken, _amountIn, outputToken, amountOut);
        return amountOut;
    }

    function addVault(address _token, address _yvToken) external onlyOwner {
        require(tokens.length % 2 == 0, "illegal state");
        tokens.push(_token);
        tokens.push(_yvToken);
    }
}
