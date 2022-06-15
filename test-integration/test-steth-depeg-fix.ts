import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { 
  BoostedEthBridgeSwapper, 
  BoostedEthBridgeSwapperOld,
  LidoBridgeSwapper, 
  LidoBridgeSwapperOld
} from "../typechain-types";
import { ICurvePool } from "../typechain-types/ICurvePool";

// to test:
// comment all the transferToZkSync/transferFromZkSync calls in the tested contracts
// and use blockNumber: 14948480

const ConfigLoader = require("../scripts/utils/configurator-loader.js");

const configLoader = new ConfigLoader("prod");
const config = configLoader.load();

describe("stETH Swappers", () => {
  let signer: SignerWithAddress;
  let yvToken: Contract;
  let wstEth: Contract;
  let stethPool: ICurvePool;
  let newLidoSwapper: LidoBridgeSwapper;
  let oldLidoSwapper: LidoBridgeSwapperOld;
  let newBoostedSwapper: BoostedEthBridgeSwapper;
  let oldBoostedSwapper: BoostedEthBridgeSwapperOld;

  const amount = ethers.utils.parseEther("7");

  beforeEach(async () => {
    [signer] = await ethers.getSigners();
    yvToken = await ethers.getContractAt("IERC20", config["yearn-crvStETH-vault"]);
    stethPool = await ethers.getContractAt("ICurvePool", config["curve-stETH-pool"]) as ICurvePool;
    wstEth = await ethers.getContractAt("IERC20", config.wstETH);

    let Contract, params;
    params = [
      config.zkSync,
      config.argent["boosted-eth-l2-account"],
      config["yearn-crvStETH-vault"],
      config["curve-stETH-pool"],
      config.argent["lido-referral"],
    ] as const;
    Contract = await ethers.getContractFactory("BoostedEthBridgeSwapperOld");
    oldBoostedSwapper = await Contract.deploy(...params) as BoostedEthBridgeSwapperOld;
    Contract = await ethers.getContractFactory("BoostedEthBridgeSwapper");
    newBoostedSwapper = await Contract.deploy(...params) as BoostedEthBridgeSwapper;

    params = [
      config.zkSync,
      config.argent["lido-l2-account"],
      config.wstETH,
      config["curve-stETH-pool"],
      config.argent["lido-referral"]
    ] as const;
    Contract = await ethers.getContractFactory("LidoBridgeSwapperOld");
    oldLidoSwapper = await Contract.deploy(...params) as LidoBridgeSwapperOld;
    Contract = await ethers.getContractFactory("LidoBridgeSwapper");
    newLidoSwapper = await Contract.deploy(...params) as LidoBridgeSwapper;
  });

  it("Should fail to trade lp->eth on the old BoostedEth swapper", async () => {
    // prepare 
    const swapper = oldBoostedSwapper;
    await signer.sendTransaction({ to: swapper.address, value: amount });
    await swapper.exchange(0, 1, amount);
    const lpBefore = await yvToken.balanceOf(swapper.address);
    console.log(`LP balance before is: ${ethers.utils.formatEther(lpBefore)}`);

    // test it
    expect(swapper.exchange(1, 0, lpBefore)).to.be.revertedWith("Not enough coins removed");
    const lpAfter = await yvToken.balanceOf(swapper.address);
    console.log(`LP balance after is: ${ethers.utils.formatEther(lpAfter)}`);
  });

  it("Should trade lp->eth on the new BoostedEth swapper", async () => {
    // prepare 
    const swapper = newBoostedSwapper;
    await signer.sendTransaction({ to: swapper.address, value: amount });
    await swapper.exchange(0, 1, amount);
    const lpBefore = await yvToken.balanceOf(swapper.address);
    console.log(`LP balance before is: ${ethers.utils.formatEther(lpBefore)}`);

    // test it
    await swapper.exchange(1, 0, lpBefore);
    const lpAfter = await yvToken.balanceOf(swapper.address);
    console.log(`LP balance after is: ${ethers.utils.formatEther(lpAfter)}`);
  });

  it("Should fail to trade stEth->eth on the old Lido swapper", async () => {
    // prepare 
    const swapper = oldLidoSwapper;
    await signer.sendTransaction({ to: swapper.address, value: amount });
    await swapper.exchange(0, 1, amount);
    const lpBefore = await wstEth.balanceOf(swapper.address);
    console.log(`stETH balance before is: ${ethers.utils.formatEther(lpBefore)}`);

    // test it
    expect(swapper.exchange(1, 0, lpBefore)).to.be.revertedWith("Exchange resulted in fewer coins than expected");

    const lpAfter = await wstEth.balanceOf(swapper.address);
    console.log(`stETH balance after is: ${ethers.utils.formatEther(lpAfter)}`);
  });

  it("Should trade stEth->eth on the new Lido swapper", async () => {
    // prepare 
    const swapper = newLidoSwapper;
    await signer.sendTransaction({ to: swapper.address, value: amount });
    await swapper.exchange(0, 1, amount);
    const lpBefore = await wstEth.balanceOf(swapper.address);
    console.log(`stETH balance before is: ${ethers.utils.formatEther(lpBefore)}`);

    // test it
    swapper.exchange(1, 0, lpBefore);

    const lpAfter = await wstEth.balanceOf(swapper.address);
    console.log(`stETH balance after is: ${ethers.utils.formatEther(lpAfter)}`);
  });
});
