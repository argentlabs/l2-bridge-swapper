//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";
import "./interfaces/IStaticAToken.sol";

/**
* @notice Exchanges tokens for their respective static Aave tokens.
* NOTE: to add a new pool, put the underlying token at the even index,
* immediately followed by the static aToken at the odd index.
* Example indexes:
* 0: DAI
* 1: stataDAI
* 2: USDC
* 3: stataUSDC
*/
contract AaveBridgeSwapper is ZkSyncBridgeSwapper {

    uint16 public immutable aaveReferral;

    address[] public tokens;

    event PoolAdded(address stataToken);

    constructor(
        address _zkSync,
        address _l2Account,
        address[] memory _stataTokens,
        uint16 _aaveReferral
    )
        ZkSyncBridgeSwapper(_zkSync, _l2Account)
    {
        for (uint i = 0; i < _stataTokens.length; i++) {
            addPool(_stataTokens[i]);
        }
        aaveReferral = _aaveReferral;
    }

    function exchange(uint256 _indexIn, uint256 _indexOut, uint256 _amountIn) external override returns (uint256 amountOut) {
        require(_indexIn < tokens.length, "invalid input index");
        require(_indexOut < tokens.length && _indexOut != _indexIn, "invalid output index");

        address inputToken = tokens[_indexIn];
        address outputToken = tokens[_indexOut];

        transferFromZkSync(inputToken);

        if (_indexIn % 2 == 0) { // deposit
            require(outputToken == tokens[_indexIn + 1], "invalid output token");

            IERC20(inputToken).approve(outputToken, _amountIn);
            amountOut = IStaticAToken(outputToken).deposit(
                msg.sender,
                _amountIn,
                aaveReferral,
                true
            );
        } else { // withdrawal
            require(outputToken == tokens[_indexIn - 1], "invalid output token");

            (, amountOut) = IStaticAToken(inputToken).withdraw(
                msg.sender,
                _amountIn,
                true
            );
        }

        transferToZkSync(outputToken, amountOut);
        emit Swapped(inputToken, _amountIn, outputToken, amountOut);
    }

    function addPool(address _stataToken) public onlyOwner {
        require(_stataToken != address(0), "null stataToken");
        address token = address(IStaticAToken(_stataToken).ASSET());
        require(token != address(0), "null token");

        tokens.push(token);
        tokens.push(_stataToken);
        assert(tokens.length % 2 == 0);

        emit PoolAdded(_stataToken);
    }
}
