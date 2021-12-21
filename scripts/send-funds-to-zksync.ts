import hre, { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const config = new ConfigLoader(hre.network.name).load();

const maxFeePerGas = ethers.utils.parseUnits("100", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei"); // "max fee" on blocknative
const options = { maxFeePerGas, maxPriorityFeePerGas };

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer is ${signer.address} holding ETH ${ethers.utils.formatEther(balance)}`);

    const zkSync = await ethers.getContractAt("IZkSync", config.zkSync);

    console.log(`zksync is ${zkSync.address}`);


    /// for ERC-20:
    // function depositERC20(IERC20 _token, uint104 _amount, address _zkSyncAddress) external;


    const yvDai = await ethers.getContractAt("IYearnVault", config.yvDai);
    const yvUsdc = await ethers.getContractAt("IYearnVault", config.yvUsdc);
    const dai = await ethers.getContractAt("IERC20", await yvDai.token());
    const usdc = await ethers.getContractAt("IERC20", await yvUsdc.token());

    const l2Account = config.argent["aave-l2-account"];

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

    // DAI:
    // tx = await dai.approve(config.zkSync, daiAmount, options);
    // console.log(`dai approve hash ${tx.hash}`);
    // estimation = await zkSync.estimateGas.depositERC20(dai.address, daiAmount, l2Account, options);
    // console.log(`gas estimation ${estimation}`);
    // tx = await zkSync.depositERC20(dai.address, daiAmount, l2Account, options);
    // console.log(`hash ${tx.hash}`);

    // USDC:
    // tx = await usdc.approve(config.zkSync, usdcAmount, options);
    // console.log(`usdc approve hash ${tx.hash}`);
    // estimation = await zkSync.estimateGas.depositERC20(usdc.address, usdcAmount, l2Account, options);
    // console.log(`gas estimation ${estimation}`);
    // tx = await zkSync.depositERC20(usdc.address, usdcAmount, l2Account, options);
    // console.log(`hash ${tx.hash}`);


    // for ETH:
    // IZkSync(zkSync).depositETH{value: _amountOut}(l2Account);
    

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
