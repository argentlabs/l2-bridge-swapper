const hre = require("hardhat");
const ConfigLoader = require("./utils/configurator-loader.js");

const { ethers } = hre;
const config = new ConfigLoader(hre.network.name).load();

const maxFeePerGas = ethers.utils.parseUnits("110", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("1.5", "gwei"); // "priority fee" on blocknative

(async () => {
  try {
    const signer = await ethers.getSigner();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

    const Swapper = await ethers.getContractFactory("LidoBridgeSwapper");
    const swapper = Swapper.attach(config.argent["lido-swapper"]);

    // const amount = ethers.utils.parseEther("0.0001");
    const amount = await ethers.provider.getBalance(swapper.address);
    console.log(`Swapper ETH balance is: ${ethers.utils.formatEther(amount)}`);

    const estimation = await swapper.estimateGas.exchange(0, 1, amount, { maxFeePerGas, maxPriorityFeePerGas });
    console.log(`gas estimation ${estimation}`);

    const tx = await swapper.exchange(0, 1, amount, { maxFeePerGas, maxPriorityFeePerGas });
    console.log(`tx is ${tx.hash}`);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
