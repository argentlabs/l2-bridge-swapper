const { getAccountPath } = require("ethers/lib/utils");
const hre = require("hardhat");

const ConfigLoader = require("./utils/configurator-loader.js");

async function main() {

  const configLoader = new ConfigLoader(hre.network.name);
  const config = await configLoader.load();

  const Swapper = await ethers.getContractFactory("ZkSyncBridgeSwapper");
  const swapper = await Swapper.deploy(
    config.zkSync,
    config.argent["l2-account"],
    config.wstETH,
    config["curve-steTH-pool"],
    config.argent["lido-referral"]
  );
  await swapper.deployed();
  config.argent.swapper = swapper.address;
  console.log("Swapper deployed to:", swapper.address);

  // update config
  await configLoader.save(config);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
