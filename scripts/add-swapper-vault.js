const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const ConfigLoader = require("./utils/configurator-loader.js");

const { ethers } = hre;
const config = new ConfigLoader(hre.network.name).load();

const maxFeePerGas = ethers.utils.parseUnits("100", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("1.5", "gwei"); // "max fee" on blocknative
const gasOptions = { maxFeePerGas, maxPriorityFeePerGas };

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

    const swapper = await ethers.getContractAt("YearnBridgeSwapper", config.argent["yearn-swapper"]);

    console.log(`swapper is ${swapper.address}`);
    const options = gasOptions;

    const yvUSDCnew = await ethers.getContractAt("IYearnVault", "0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE");
    console.log(`usdc is ${(await yvUSDCnew.token())}`);

    let tx, estimation;
    estimation = await swapper.estimateGas.addVault(yvUSDCnew.address);
    console.log(`gas estimation ${estimation}`);
    tx = await swapper.addVault(yvUSDCnew.address, { ...options, gasLimit: ethers.BigNumber.from(86_000) });
    console.log(`tx hash ${tx.hash}`);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
