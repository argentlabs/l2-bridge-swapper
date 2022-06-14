//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "./ZkSyncBridgeSwapper.sol";
import "./interfaces/ILido.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/IYearnVault.sol";
import "./BoostedEthBridgeSwapper.sol";

contract BoostedEthBridgeSwapperPricingProxy {

    BoostedEthBridgeSwapper public immutable target;
    address public immutable yvCrvStEth;
    ICurvePool public immutable stEthPool;

    constructor(BoostedEthBridgeSwapper _target) {
        target = _target;
        yvCrvStEth = _target.yvCrvStEth.address;
        stEthPool = ICurvePool(_target.stEthPool.address);
    }

    // same interface as the mainnet contracts

    function yvCrvStEthPerEth() public view returns (uint256) {
        return yvCrvStEthPerEth(1 ether /* TODO: use median trade size instead */); 
    }

    function ethPerYvCrvStEth() public view returns (uint256) {
        return ethPerYvCrvStEth(1 ether /* TODO: use median trade size instead */); 
    }

    // updated methods with different interfaces from the post-audit contracts, not yet on mainnet

    function ethPerYvCrvStEth(uint256 _yvCrvStEthAmount) public view returns (uint256) {
        uint256 crvStEthAmount = _yvCrvStEthAmount * IYearnVault(yvCrvStEth).pricePerShare() / 1 ether;
        return stEthPool.calc_withdraw_one_coin(crvStEthAmount, 0);
    }

    function yvCrvStEthPerEth(uint256 _ethAmount) public view returns (uint256) {
        uint256 crvStEthAmount = stEthPool.calc_token_amount([_ethAmount, 0], true);
        return 1 ether * crvStEthAmount / IYearnVault(yvCrvStEth).pricePerShare();
    }

    // forward all other calls to already deployed BoostedEthBridgeSwapper

    fallback() external payable {
        (bool success, ) = address(target).call{value: msg.value}(msg.data);
        if (!success) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

	// TODO: recover tokens
    receive() external payable {
    }
}
