//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStaticAToken is IERC20 {
    /**
     * @notice The underlying token
     */
    function ASSET() external returns (IERC20);

    /**
    * @dev Deposits `ASSET` in the Aave protocol and mints static aTokens to msg.sender
    * @param recipient The address that will receive the static aTokens
    * @param amount The amount of underlying `ASSET` to deposit (e.g. deposit of 100 USDC)
    * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
    *   0 if the action is executed directly by the user, without any middle-man
    * @param fromUnderlying bool
    * - `true` if the msg.sender comes with underlying tokens (e.g. USDC)
    * - `false` if the msg.sender comes already with aTokens (e.g. aUSDC)
    * @return uint256 The amount of StaticAToken minted, static balance
    **/
    function deposit(
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) external returns (uint256);

    /**
    * @dev Burns `amount` of static aToken, with recipient receiving the corresponding amount of `ASSET`
    * @param recipient The address that will receive the amount of `ASSET` withdrawn from the Aave protocol
    * @param amount The amount to withdraw, in static balance of StaticAToken
    * @param toUnderlying bool
    * - `true` for the recipient to get underlying tokens (e.g. USDC)
    * - `false` for the recipient to get aTokens (e.g. aUSDC)
    * @return amountToBurn: StaticATokens burnt, static balance
    * @return amountToWithdraw: underlying/aToken send to `recipient`, dynamic balance
    **/
    function withdraw(
        address recipient,
        uint256 amount,
        bool toUnderlying
    ) external returns (uint256, uint256);
}
