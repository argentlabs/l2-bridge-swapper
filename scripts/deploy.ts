import { Overrides } from "ethers";
import hre, { ethers } from "hardhat";

const ConfigLoader = require("./utils/configurator-loader.js");
if (hre.network.name !== "hardhat") {
  require("@nomiclabs/hardhat-etherscan");
}

const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

const maxFeePerGas = ethers.utils.parseUnits("100", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei"); // "priority fee" on blocknative
// const gasOptions = { maxFeePerGas, maxPriorityFeePerGas }; // if trying to save on gas
const gasOptions = {};

interface DeployOptions {
  contractName: string;
  configKey: string;
  args: any[];
  options?: Overrides;
}

const deploySwapper = async ({ contractName, configKey, args, options }: DeployOptions) => {
  args.forEach((arg, index) => {
    if (typeof arg === "undefined") {
      throw new Error(`Argument #${index + 1} for ${contractName} is undefined, missing config key? Config is: ${JSON.stringify(config)}`);
    }
  });
  options = { ...gasOptions, ...options };

  console.log(`Deploying ${contractName}...`);
  const Swapper = await ethers.getContractFactory(contractName);
  const swapper = await Swapper.deploy(...args, options);
  console.log(`Pending at: ${swapper.address}`);
  await swapper.deployed();
  console.log(`Deployed with tx: ${swapper.deployTransaction.hash}`);

  config.argent[configKey] = swapper.address;
  configLoader.save(config);

  await swapper.changeOwner(config.argent["owner"]);
  console.log(`Changed owner to: ${config.argent["owner"]}`);

  if (hre.network.name !== "hardhat") {
    console.log("Waiting to upload code to Etherscan...");
    await swapper.deployTransaction.wait(5);
    await hre.run("verify:verify", { address: swapper.address, constructorArguments: args });
  }

  return swapper;
}

const deployLido = () => (
  deploySwapper({
    contractName: "LidoBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent["lido-l2-account"],
      config.wstETH,
      config["curve-stETH-pool"],
      config.argent["lido-referral"]
    ],
    configKey: "lido-swapper",
  })
);

const deployYearn = () => (
  deploySwapper({
    contractName: "YearnBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent["yearn-l2-account"],
      [
        config.yvDai,
        config.yvUsdc,
        config.yvWBtc,
      ],
    ],
    configKey: "yearn-swapper",
  })
);

const deployBoostedEth = () => (
  deploySwapper({
    contractName: "BoostedEthBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent["boosted-eth-l2-account"],
      config["yearn-crvStETH-vault"],
      config["curve-stETH-pool"],
      config.argent["lido-referral"],
    ],
    configKey: "boosted-eth-swapper",
  })
);

const deployGroGvt = async (stablecoin: "dai" | "usdc" | "usdt") => {
  const stablecoins = ["dai", "usdc", "usdt"];
  const index = stablecoins.indexOf(stablecoin);
  if (index < 0) {
    throw new Error("Invalid stablecoin");
  }

  deploySwapper({
    contractName: "GroGvtBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent[`gro-${stablecoin}-l2-account`],
      config["gro-controller"],
      index,
      config.argent["gro-referral"],
    ],
    configKey: `gro-${stablecoin}-swapper`,
  });
};

export const deployAave = () => (
  deploySwapper({
    contractName: "AaveBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent["aave-l2-account"],
      [
        config.stataDai,
        config.stataUsdc,
      ],
    ],
    configKey: "aave-swapper",
  })
);

module.exports = { 
  deployLido,
  deployYearn,
  deployBoostedEth,
  deployGroGvt,
  deployAave,
};

(async () => {
  if (require.main !== module) {
    return;
  }

  try {
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer is ${signer.address} holding ETH ${ethers.utils.formatEther(balance)}`);

    const minimumBalance = ethers.utils.parseEther("0.1");
    if (balance.lt(minimumBalance)) {
      throw new Error("Not enough ETH, exiting");
    }

    // await deployLido();
    // await deployYearn();
    // await deployBoostedEth();
    // await deployGroGvt("dai");
    // await deployGroGvt("usdc");
    await deployAave();

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
