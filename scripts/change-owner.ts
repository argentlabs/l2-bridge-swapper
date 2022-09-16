import hre, { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const config = new ConfigLoader(hre.network.name).load();

(async () => {
  const [signer] = await ethers.getSigners();
  console.log(`Signer is ${signer.address}`);
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

  const swapper = await ethers.getContractAt("ZkSyncBridgeSwapper", config.argent["lido-swapper"]);
  console.log("swapper is", swapper.address);

  const tx = await swapper.changeOwner(config.argent.owner);
  console.log("tx", tx.hash);

  const receipt = await tx.wait();
  console.log("receipt", !!receipt);
})();
