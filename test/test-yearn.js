const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Yearn Bridge Swapper", function () {

  let zap;
  let zkSync;
  let l2Account;
  let deployer;

  let dai;
  let yvDai;
  let usdc;
  let yvUsdc;

  const amount = ethers.utils.parseEther("1.0");

  before(async function() {
    [deployer, l2Account, newOwner] = await ethers.getSigners();
    Zap = await ethers.getContractFactory("YearnBridgeSwapper");
    ZkSync = await ethers.getContractFactory("ZKSyncMock");
    YearnVault = await ethers.getContractFactory("YearnVaultMock");
    ERC20 = await ethers.getContractFactory("ERC20PresetFixedSupply");
    dai = await ERC20.deploy("DAI Token", "DAI", ethers.utils.parseEther("200"), deployer.address);
    usdc = await ERC20.deploy("USD Coin Token", "USDC", ethers.utils.parseEther("200"), deployer.address);
    yvDai = await YearnVault.deploy(dai.address);
    yvUsdc = await YearnVault.deploy(usdc.address);
    zkSync = await ZkSync.deploy();

    await dai.approve(yvDai.address, ethers.utils.parseEther("100"));
    await yvDai.deposit(ethers.utils.parseEther("100"));
  })

  async function sendETH(recipient, amount) {
    await deployer.sendTransaction({ to: recipient, value: amount });
  }

  beforeEach(async function() {
    zap = await Zap.deploy(zkSync.address, l2Account.address, [
      yvDai.address,
      yvUsdc.address,
    ]);
    await sendETH(zap.address, amount);
    await dai.transfer(zap.address, amount);
    await yvDai.transfer(zap.address, amount);
    await dai.transfer(zkSync.address, amount);
    await yvDai.transfer(zkSync.address, amount);
  });

  it("Should init the environment", async function () {
    expect(await dai.balanceOf(zap.address)).to.equal(amount);
    expect(await yvDai.balanceOf(zap.address)).to.equal(amount);
    expect(await zap.owner()).to.equal(deployer.address);
  });

  it("Should swap yvDAI for DAI when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const depositedBefore = await zkSync.getDepositedERC20(dai.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, yvDai.address, 0);
    await zap.exchange(1, 0, amountIn);
    const depositedAfter = await zkSync.getDepositedERC20(dai.address, l2Account.address);
    expect(depositedAfter.sub(depositedBefore)).to.equal(amountIn);
  });

  it("Should swap wrapped yvDAI for DAI when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const depositedBefore = await zkSync.getDepositedERC20(dai.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, yvDai.address, ethers.utils.parseEther("0.1"));
    await zap.exchange(1, 0, amountIn);
    const depositedAfter = await zkSync.getDepositedERC20(dai.address, l2Account.address);
    expect(depositedAfter.sub(depositedBefore)).to.equal(amountIn);
    const balance = await zkSync.getPendingBalance(zap.address, yvDai.address);
    expect(balance).to.equal(0);
  });

  it("Should emit event when swapping yvDAI for DAI", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(1, 0, amountIn)).to.emit(zap, "Swapped");
  });

  it("Should swap DAI for yvDAI when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(yvDai.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, dai.address, 0);
    await zap.exchange(0, 1, amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(yvDai.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap DAI for yvDAI when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const depositedBefore = await zkSync.getDepositedERC20(yvDai.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, dai.address, ethers.utils.parseEther("0.1"));
    await zap.exchange(0, 1, amountIn);
    const depositedAfter = await zkSync.getDepositedERC20(yvDai.address, l2Account.address);
    expect(depositedAfter.sub(depositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(zap.address, dai.address)).to.equal(0);
  });

  it("Should emit event when swapping DAI for yvDAI", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(0, 1, amountIn)).to.emit(zap, "Swapped");
  });

  it("Should add a new vault with its underlying token", async function () {
    await expect(zap.tokens(4)).to.be.reverted;
    await expect(zap.addVault(yvUsdc.address)).to.emit(zap, "VaultAdded");
    expect(await zap.tokens(4)).to.equal(usdc.address);
    expect(await zap.tokens(5)).to.equal(yvUsdc.address);
  });

  it("Should fail to add a new vault with a zero address", async function () {
    await expect(zap.addVault(ethers.constants.AddressZero)).to.be.revertedWith("null yvToken");
  });

  it("Should fail to swap 2 underlyings", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(0, 2, amountIn)).to.be.revertedWith("invalid output token");
    await expect(zap.exchange(2, 0, amountIn)).to.be.revertedWith("invalid output token");
  });

  it("Should fail to swap 2 vault tokens", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(1, 3, amountIn)).to.be.revertedWith("invalid output token");
    await expect(zap.exchange(3, 1, amountIn)).to.be.revertedWith("invalid output token");
  });

  it("Should fail to swap an underlying with the wrong vault token", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(0, 3, amountIn)).to.be.revertedWith("invalid output token");
    await expect(zap.exchange(3, 0, amountIn)).to.be.revertedWith("invalid output token");
  });
});
