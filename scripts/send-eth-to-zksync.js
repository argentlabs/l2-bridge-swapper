const hre = require("hardhat");
// const ConfigLoader = require("./utils/configurator-loader.js");

const { ethers } = hre;
// const config = new ConfigLoader(hre.network.name).load();

const maxFeePerGas = ethers.utils.parseUnits("100", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei"); // "max fee" on blocknative

(async () => {
  try {
    const signer = await ethers.getSigner();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

    const zkSyncAddress = "0xabea9132b05a70803a4e85094fd0e1800777fbef";
    const zkSync = await ethers.getContractAt("IZkSync", zkSyncAddress);

    // IZkSync(zkSync).depositETH{value: _amountOut}(l2Account);
    const l2Account = "0xd9bc104c9200534ef2158570cb9eed079fc3cb4d";
    const amount = ethers.utils.parseEther("0.05");
    // const estimation = await zkSync.estimateGas.depositETH(l2Account, { value: amount, maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`gas estimation ${estimation}`);
    const tx = await zkSync.depositETH(l2Account, { value: amount, maxFeePerGas, maxPriorityFeePerGas });
    console.log(`tx ${tx.hash}`);
    console.log(tx);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
