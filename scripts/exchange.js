const hre = require("hardhat");
const ConfigLoader = require("./utils/configurator-loader.js");

const { ethers } = hre;
const config = new ConfigLoader(hre.network.name).load();

(async () => {
  try {
    const signer = await ethers.getSigner();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

    const Swapper = await ethers.getContractFactory("BoostedEthBridgeSwapper");
    const swapper = Swapper.attach(config.argent["boosted-eth-swapper"]);
    const amount = ethers.utils.parseEther("0.01");

    const tx = await swapper.exchange(0, 1, amount, { gasLimit: 1_000_000 });
    console.log(`tx is ${tx.hash}`);
    await tx.wait();

    console.log(`done`);
    console.log(`receipt is ${tx.receipt}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
