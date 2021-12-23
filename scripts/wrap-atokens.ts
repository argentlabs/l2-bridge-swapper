import hre, { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

const maxFeePerGas = ethers.utils.parseUnits("60", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("1.5", "gwei"); // "priority fee" on blocknative

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    const ethBalance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer is ${signer.address} holding ETH ${ethers.utils.formatEther(ethBalance)}`);

    const stataToken = await ethers.getContractAt("IStaticATokenLM", config.stataUsdc);
    const aToken = await ethers.getContractAt("IERC20", await stataToken.ATOKEN());

    const balance = await aToken.balanceOf(signer.address);
    const amount = await aToken.allowance(signer.address, stataToken.address);
    console.log(`aToken balance ${ethers.utils.formatUnits(balance, 6)}`);
    console.log(`aToken amount  ${ethers.utils.formatUnits(amount, 6)}`);

    console.log(`stataToken balance ${ethers.utils.formatUnits(await stataToken.balanceOf(signer.address), 6)}`);
    await aToken.approve(stataToken.address, balance);
    await stataToken.deposit(signer.address, amount, 0, false);
    console.log(`stataToken balance ${ethers.utils.formatUnits(await stataToken.balanceOf(signer.address), 6)}`);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
