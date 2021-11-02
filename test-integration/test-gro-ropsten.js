const hre = require("hardhat");
const ConfigLoader = require("../scripts/utils/configurator-loader.js");

const { ethers } = hre;
const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

describe("Gro Bridge Swapper", function() {

  let swapper;
  let dai;
  let gvt;
  let signer;

  const amount = ethers.utils.parseEther("100");

  before(async () => {
    [signer] = await ethers.getSigners();
    console.log(`deployer is ${signer.address}`);
    const groDaiAddress = "0xBad346b9d0f4272DB9B01AA6F16761115B851277";
    const gvtAddress = "0x4394be2135357833A9e18D5A73B2a0C629efE984";

    swapper = await ethers.getContractAt("GroGvtBridgeSwapper", config.argent["gro-swapper"]);
    dai = await ethers.getContractAt("IERC20", groDaiAddress);
    gvt = await ethers.getContractAt("IERC20", gvtAddress);

    // const result = await dai.transfer(swapper.address, ethers.utils.parseEther("1000"));
    // console.log(`recovered ${result.hash}`);

    // console.log(`minting mock DAI`);
    // const abi = ["function faucet() external override"];
    // const groDaiFaucet = new ethers.Contract(groDaiAddress, abi, deployer);
    // await groDaiFaucet.faucet();

  });

  it("Should exchange DAI for GVT", async () => {
    const depositHandlerAddress = await swapper.depositHandler();
    const depositHandler = await ethers.getContractAt("IGroDepositHandler", depositHandlerAddress);

    // const maxFeePerGas = ethers.utils.parseUnits("400", "gwei"); // "base fee + priority fee" on blocknative
    // const maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei"); // "priority fee" on blocknative
    // await dai.approve(depositHandlerAddress, amount, { nonce: 61 });
    // await depositHandler.depositGvt([amount, 0, 0], 1, ethers.constants.AddressZero, { gasLimit: 5e6 });
    // return;

    const amount = ethers.utils.parseEther("0.3");
    // await gvt.transfer(swapper.address, amount);
    // return

    console.log(`gvt balance is ${ethers.utils.formatEther(await gvt.balanceOf(swapper.address))}`);
    console.log(`amount is      ${ethers.utils.formatEther(amount)}`);
    const tx = await swapper.exchange(1, 0, amount, { gasLimit: 5e6 });
    console.log(`tx hash is ${tx.hash}`);
  });
});
