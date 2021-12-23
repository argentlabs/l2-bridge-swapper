# l2-bridge-swapper

## Objective

The goal of the `Swapper` contracts is to rebalance liquidity pools on Layer 2 (L2) and to bridge DeFi tokens from L1 to L2.

Argent operates the liquidity pools on L2. Each pool is made of a DeFi LP token (stETH, yvUSDC, etc) and its underlying token (ETH, USDC, etc). Users can buy and sell the LP token on L2 in exchange for the underlying token. 

As trades accumulate, the liquidity in the pool becomes unbalanced. The operator of the pool can decide to withdraw the excess tokens from L2 to a dedicated `Swapper` contract on L1 which will exchange the excess tokens for the scarce tokens and deposit back the exchanged tokens to the liquidity pool on L2 in one atomic transaction.

The target L2 is zkSync v1.0.

## DeFi tokens

The following DeFi tokens pairs are currently supported:

- stETH (wrapped) / ETH using Lido Finance
- yvUSDC / USDC using Yearn
- yvDAI / DAI using Yearn
- yvWBTC / WBTC using Yearn
- yvCrvStETH / ETH using Yearn
- GVT / DAI using Gro Protocol
- GVT / USDC using Gro Protocol
- aDAI (wrapped) / DAI using Aave
- aUSDC (wrapped) / USDC using Aave

The wrapped versions are non-rebasing representations of the tokens.

## Specification

Each `Swapper` contract must:

- Exchange a DeFi token for its underlying token, or vice versa, in one atomic transaction.
- Allow anyone to call the `exchange` method and swap one token for the other, provided that the contract has sufficient balance.
- Allow the owner to recover tokens if needed.
