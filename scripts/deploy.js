const hre = require("hardhat");
if (hre.network.name !== "hardhat") {
  require("@nomiclabs/hardhat-etherscan");
}

const ConfigLoader = require("./utils/configurator-loader.js");

async function main() {

  let args, Swapper, swapper;
  const configLoader = new ConfigLoader(hre.network.name);
  const config = configLoader.load();

  // Lido

  args = [
    config.zkSync,
    config.argent["lido-l2-account"],
    config.wstETH,
    config["curve-steTH-pool"],
    config.argent["lido-referral"]
  ];
  Swapper = await ethers.getContractFactory("LidoBridgeSwapper");
  swapper = await Swapper.deploy(...args);
  console.log("Lido swapper deployed to:", swapper.address);
  await swapper.deployed();

  config.argent["lido-swapper"] = swapper.address;
  configLoader.save(config);

  if (hre.network.name !== "hardhat") {
    console.log("Uploading code to Etherscan...");
    await swapper.deployTransaction.wait(3);
    await hre.run("verify:verify", { address: swapper.address, constructorArguments: args });
  }

  // Yearn

  args = [
    config.zkSync,
    config.argent["yearn-l2-account"],
    [config.yvUsdc],
  ];
  Swapper = await ethers.getContractFactory("YearnBridgeSwapper");
  swapper = await Swapper.deploy(...args, { gasLimit: 2_000_000 });
  console.log("Yearn swapper deployed to:", swapper.address);
  await swapper.deployed();

  config.argent["yearn-swapper"] = swapper.address;
  configLoader.save(config);

  if (hre.network.name !== "hardhat") {
    console.log("Uploading code to Etherscan...");
    await swapper.deployTransaction.wait(3);
    await hre.run("verify:verify", { address: swapper.address, constructorArguments: args });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
