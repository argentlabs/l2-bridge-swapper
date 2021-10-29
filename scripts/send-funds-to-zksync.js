const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const ConfigLoader = require("./utils/configurator-loader.js");

const { ethers } = hre;
const config = new ConfigLoader(hre.network.name).load();

const maxFeePerGas = ethers.utils.parseUnits("130", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei"); // "max fee" on blocknative

(async () => {
  try {
    const signer = await ethers.getSigner();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

    const zkSync = await ethers.getContractAt("IZkSync", config.zkSync);

    console.log(`zksync is ${zkSync.address}`);


    /// for ERC-20:
    // function depositERC20(IERC20 _token, uint104 _amount, address _zkSyncAddress) external;


    const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const l2Account = "0xcf1c324547834c1c2921b757e9ec84e50c52e5cc";

    const dai = await ethers.getContractAt("IERC20", daiAddress);
    const usdc = await ethers.getContractAt("IERC20", usdcAddress);

    const daiAmount = ethers.utils.parseEther("1000");
    // const daiAmount = BigNumber.from(2).pow(252);
    // const usdcAmount = BigNumber.from(10).pow(6);
    // const uint104Max = BigNumber.from(2).pow(104).sub(1);
    const usdcAmount = await usdc.balanceOf(signer.address);

    console.log(`dai  balance ${await dai.balanceOf(signer.address)}`);
    console.log(`daiAmount    ${daiAmount}`);
    console.log(`usdc balance ${await usdc.balanceOf(signer.address)}`);
    console.log(`usdcAmount   ${usdcAmount}`);

    let tx, estimation;
    // tx = await dai.approve(config.zkSync, daiAmount, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`dai approve hash ${tx.hash}`);
    // estimation = await zkSync.estimateGas.depositERC20(daiAddress, daiAmount, l2Account, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`gas estimation ${estimation}`);
    tx = await zkSync.depositERC20(daiAddress, daiAmount, l2Account, { maxFeePerGas, maxPriorityFeePerGas });
    console.log(`hash ${tx.hash}`);

    // tx = await usdc.approve(config.zkSync, usdcAmount, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`usdc approve hash ${tx.hash}`);
    // estimation = await zkSync.estimateGas.depositERC20(usdcAddress, usdcAmount, l2Account, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`gas estimation ${estimation}`);
    tx = await zkSync.depositERC20(usdcAddress, usdcAmount, l2Account, { maxFeePerGas, maxPriorityFeePerGas });
    console.log(`hash ${tx.hash}`);
    return;


    // for ETH:
    // IZkSync(zkSync).depositETH{value: _amountOut}(l2Account);
    

    // const l2Account = "0xd9bc104c9200534ef2158570cb9eed079fc3cb4d";
    // const amount = ethers.utils.parseEther("0.05");
    // const estimation = await zkSync.estimateGas.depositETH(l2Account, { value: amount, maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`gas estimation ${estimation}`);
    // const tx = await zkSync.depositETH(l2Account, { value: amount, maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`tx ${tx.hash}`);
    // console.log(tx);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
