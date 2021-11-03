const hre = require("hardhat");
const ConfigLoader = require("./utils/configurator-loader.js");
if (hre.network.name !== "hardhat") {
  require("@nomiclabs/hardhat-etherscan");
}

const { ethers } = hre;
const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

const maxFeePerGas = ethers.utils.parseUnits("100", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei"); // "priority fee" on blocknative
const gasOptions = { maxFeePerGas, maxPriorityFeePerGas };

async function deploySwapper({contractName, configKey, args, options = {}}) {
  args.forEach((arg, index) => {
    if (typeof arg === "undefined") {
      throw new Error(`Argument #${index + 1} for ${contractName} is undefined, missing config key? Config is: ${JSON.stringify(config)}`);
    }
  });

  const Swapper = await ethers.getContractFactory(contractName);
  const swapper = await Swapper.deploy(...args, options);
  console.log(`Deploying ${contractName} to:`, swapper.address);
  const tx = await swapper.deployed();
  console.log(`Deployment tx ${tx.hash}`);

  config.argent[configKey] = swapper.address;
  configLoader.save(config);

  if (hre.network.name !== "hardhat") {
    console.log("Uploading code to Etherscan...");
    await swapper.deployTransaction.wait(3);
    await hre.run("verify:verify", { address: swapper.address, constructorArguments: args });
  }

  return swapper;
}

const deployLido = async () => (
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
    options: gasOptions,
  })
);

const deployYearn = async () => (
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
    options: gasOptions,
  })
);

const deployBoostedEth = async () => (
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
    options: gasOptions,
  })
);

const deployGroGvt = async (stablecoin) => {
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
    options: gasOptions,
  });
};

module.exports = { 
  deployLido,
  deployYearn,
  deployBoostedEth,
  deployGroGvt,
};

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance: ${ethers.utils.formatEther(balance)}`);

    const minimumBalance = ethers.utils.parseEther("0.2");
    if (balance.lt(minimumBalance)) {
      throw new Error("Not enough ETH, exiting");
    }

    // await deployLido();
    // await deployYearn();
    // await deployBoostedEth();
    // await deployGroGvt("dai");
    // await deployGroGvt("usdc");

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
