# l2-bridge-swapper

## Objective

The goal of the `Swapper` contracts is to orchestrate the rebalancing of a liquidity pool in Layer 2 (L2) and to pool Defi tokens from L1 to L2.

Argent operates liquidity pools in Layer 2. Each pool is made of a Defi token (stETH, yUSDC, etc) and a native token (ETH, USDC, etc). Users can buy and sell the Defi token on the Layer 2 in exchange of the native token. 

As trades accumulate, the liquidity in the pool becomes unbalanced. The operator of the pool can decide to withdraw the excess tokens from L2 to a dedicated `Swapper` contract on L1 which will orchestrate the exchange of the excess token and deposit back the exchanged tokens to the liquidity pool in L2 in one atomic transaction.

The target L2 is ZkSync v1.0.

## Defi tokens

The following Defi tokens are currently supported

- stETH / ETH using Lido Finance
- yUSDC / USDC using Yearn
- yDAI / DAI using Yearn
- yWBTC / WBTC using Yearn
- crvStEth / ETH using Yearn
- GVT / DAI using Gro Protocol
- GVT / USDC using Gro Protocol

## Specification

Each `Swapper` contract must

- exchange a Defi token for its native token, or vice versa, in one atomic transaction.
- allow anyone to call the `exchange` method and swap one token for the other provided that the contract has sufficient balance.
- allow the owner to recover tokens if needed
