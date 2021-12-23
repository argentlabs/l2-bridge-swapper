import hre, { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const config = new ConfigLoader(hre.network.name).load();

const maxFeePerGas = ethers.utils.parseUnits("100", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei"); // "max fee" on blocknative
// const options = { maxFeePerGas, maxPriorityFeePerGas };
const options = {};

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer is ${signer.address} holding ETH ${ethers.utils.formatEther(balance)}`);

    const zkSync = await ethers.getContractAt("IZkSync", config.zkSync);
    console.log(`zksync is ${zkSync.address}`);
    const l2Account = config.argent["aave-l2-account"];
    console.log("l2 account", l2Account);


    /// for ERC-20:
    // function depositERC20(IERC20 _token, uint104 _amount, address _zkSyncAddress) external;


    const stataDai = await ethers.getContractAt("IStaticATokenLM", config.stataDai);
    const token = await ethers.getContractAt("IERC20", await stataDai.ASSET());

    const tokenBalance = await token.balanceOf(signer.address);
    const amount = ethers.utils.parseUnits("50", 18);
    console.log(`balance ${tokenBalance}`);
    console.log(`amount  ${amount}`);

    let tx;
    tx = await token.approve(config.zkSync, amount, options);
    console.log(`approve hash ${tx.hash}`);
    const estimation = await zkSync.estimateGas.depositERC20(token.address, tokenBalance, l2Account, options);
    console.log(`gas estimation ${estimation}`);
    tx = await zkSync.depositERC20(token.address, amount, l2Account, options);
    console.log(`deposit hash ${tx.hash}`);


    // for ETH:
    // IZkSync(zkSync).depositETH{value: _amountOut}(l2Account);
    

    // const amount = ethers.utils.parseEther("0.05");
    // const estimation = await zkSync.estimateGas.depositETH(l2Account, { value: amount, maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`gas estimation ${estimation}`);
    // tx = await zkSync.depositETH(l2Account, { value: amount, maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`tx ${tx.hash}`);
    // console.log(tx);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
