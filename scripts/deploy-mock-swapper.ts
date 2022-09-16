import hre, { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const config = new ConfigLoader(hre.network.name).load();

(async () => {
  console.log("using network", hre.network.name);

  const [signer] = await ethers.getSigners();
  console.log(`Signer is ${signer.address}`);
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

  const Lido = await ethers.getContractFactory("LidoMock");
  const WstETH = await ethers.getContractFactory("WstETHMock");
  const CurvePool = await ethers.getContractFactory("CurvePoolMock");
  const Swapper = await ethers.getContractFactory("LidoBridgeSwapper");

  const lido = await Lido.deploy();
  await lido.deployed();
  console.log("Mock Lido is", lido.address);

  const wstETH = await WstETH.deploy(lido.address);
  await wstETH.deployed();
  console.log("Mock WstETH is", wstETH.address);

  const curvePool = await CurvePool.deploy(lido.address, ethers.constants.AddressZero);
  await curvePool.deployed();
  console.log("Mock CurvePool is", curvePool.address);

  const swapper = await Swapper.deploy(
    config.zkSync,
    config.argent["lido-l2-account"],
    wstETH.address,
    curvePool.address,
    ethers.constants.AddressZero
  );
  await swapper.deployed();
  console.log("Swapper is", swapper.address);
})();
