import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { setTokenBalance } from "./lib/balance-monkey-patch";
import { AaveBridgeSwapper } from "../typechain-types/AaveBridgeSwapper";

const ConfigLoader = require("../scripts/utils/configurator-loader.js");

const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

describe("Aave Bridge Swapper", () => {
  let signer: SignerWithAddress;
  let dai: Contract;
  let stataDai: Contract;
  let zkSync: Contract;
  let swapper: AaveBridgeSwapper;

  const amount = ethers.utils.parseEther("1000").toString();

  before(async () => {
    [signer] = await ethers.getSigners();
    stataDai = await ethers.getContractAt("IStaticATokenLM", config.stataDai);
    dai = await ethers.getContractAt("IERC20", await stataDai.ASSET());
  });

  beforeEach(async () => {
    const ZkSync = await ethers.getContractFactory("ZKSyncMock");
    zkSync = await ZkSync.deploy();

    const Swapper = await ethers.getContractFactory("AaveBridgeSwapper");
    swapper = await Swapper.deploy(zkSync.address, ethers.constants.AddressZero, [stataDai.address]) as AaveBridgeSwapper;
  });

  it("Should deposit and withdraw DAI natively", async () => {
    await setTokenBalance(dai.address, signer.address, amount);

    const daiBefore = await dai.balanceOf(signer.address);
    const stataDaiBefore = await stataDai.balanceOf(signer.address);

    await dai.approve(stataDai.address, amount);
    await stataDai.deposit(signer.address, amount, 0, true);

    const daiAfter = await dai.balanceOf(signer.address);
    const stataDaiAfter = await stataDai.balanceOf(signer.address);
    expect(daiAfter.eq(0)).to.be.true;
    expect(stataDaiAfter.gt(stataDaiBefore)).to.be.true;

    await stataDai.withdraw(signer.address, stataDaiAfter, true);

    const daiFinal = await dai.balanceOf(signer.address);
    const stataDaiFinal = await stataDai.balanceOf(signer.address);
    expect(daiFinal.gt(daiBefore)).to.be.true; // earned some interest
    expect(stataDaiFinal.eq(0)).to.be.true;
  });

  it("Should exchange DAI to stataDAI", async () => {
    await setTokenBalance(dai.address, swapper.address, amount);

    const daiBefore = await dai.balanceOf(swapper.address);
    const stataDaiBefore = await stataDai.balanceOf(zkSync.address);

    await swapper.exchange(0, 1, daiBefore);

    const daiAfter = await dai.balanceOf(swapper.address);
    const stataDaiAfter = await stataDai.balanceOf(zkSync.address);
    expect(daiAfter.eq(0)).to.be.true;
    expect(stataDaiAfter.gt(stataDaiBefore)).to.be.true;
  });

  it("Should exchange stataDAI to DAI", async () => {
    await setTokenBalance(dai.address, signer.address, amount);
    await dai.approve(stataDai.address, amount);
    await stataDai.deposit(swapper.address, amount, 0, true);

    const daiBefore = await dai.balanceOf(zkSync.address);
    const stataDaiBefore = await stataDai.balanceOf(swapper.address);

    await swapper.exchange(1, 0, stataDaiBefore);

    const daiAfter = await dai.balanceOf(zkSync.address);
    const stataDaiAfter = await stataDai.balanceOf(swapper.address);
    expect(daiAfter.gt(daiBefore)).to.be.true;
    expect(stataDaiAfter.eq(0)).to.be.true;
  });
});
