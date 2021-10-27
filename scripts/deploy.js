const hre = require("hardhat");
const ConfigLoader = require("./utils/configurator-loader.js");
if (hre.network.name !== "hardhat") {
  require("@nomiclabs/hardhat-etherscan");
}

const { ethers } = hre;
const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

async function deploySwapper({contractName, configKey, args, options = {}}) {
  args.forEach((arg, index) => {
    if (typeof arg === "undefined") {
      throw new Error(`Argument #${index + 1} for ${contractName} is undefined, missing config key? Config is: ${JSON.stringify(config)}`);
    }
  });

  const Swapper = await ethers.getContractFactory(contractName);
  const swapper = await Swapper.deploy(...args, options);
  console.log(`Deploying ${contractName} to:`, swapper.address);
  await swapper.deployed();

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
  })
);

const deployYearn = async () => (
  deploySwapper({
    contractName: "YearnBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent["yearn-l2-account"],
      [config.yvDai],
    ],
    configKey: "yearn-swapper",
    options: { gasLimit: 2_000_000 },
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
    configKey: "boosted-eth-swapper"
  })
);

const deployGroGvt = async (stablecoinIndex = 0) => (
  deploySwapper({
    contractName: "GroGvtBridgeSwapper", 
    args: [
      config.zkSync,
      config.argent["gro-l2-account"],
      config["gro-controller"],
      stablecoinIndex,
      config.argent["gro-referral"],
    ],
    configKey: "gro-swapper"
  })
);

module.exports = { 
  deployLido,
  deployYearn,
  deployBoostedEth,
  deployGroGvt,
};

(async () => {
  try {
    const signer = await ethers.getSigner();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Deployer ETH balance: ${ethers.utils.formatEther(balance)}`);

    const minimumBalance = ethers.utils.parseEther("0.2");
    if (balance.lt(minimumBalance)) {
      throw new Error("Not enough ETH, exiting");
    }

    // await deployLido();
    // await deployYearn();
    // await deployBoostedEth();
    // await deployGro();

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
