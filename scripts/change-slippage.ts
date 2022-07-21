import { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const config = new ConfigLoader("prod").load();

(async () => {
  const [signer] = await ethers.getSigners();
  console.log(`Signer is ${signer.address}`);
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

  // const swapper = await ethers.getContractAt("BoostedEthBridgeSwapper", config.argent["boosted-eth-swapper"]);
  const swapper = await ethers.getContractAt("LidoBridgeSwapper", config.argent["lido-swapper"]);
  console.log("swapper is", swapper.address);

  // 1000000  = 1%
  // 2500000  = 2.5%
  // 10000000 = 10%
  const tx = await swapper.changeSlippage("10000000")
  console.log("tx", tx);

  const result = await tx.wait();
  console.log("result", result);
})();
