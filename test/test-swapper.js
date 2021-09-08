const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bridge Swapper", function () {

  let lido;
  let zkSync;
  let curve;
  let wstETH;
  let zap;
  let l2Account;
  let deployer;
  let newOwner;

  before(async function() {
    [deployer, l2Account, newOwner] = await ethers.getSigners();
    Lido = await ethers.getContractFactory("LidoMock");
    WstETH = await ethers.getContractFactory("WstETHMock");
    ZkSync = await ethers.getContractFactory("ZKSyncMock");
    Curve = await ethers.getContractFactory("CurvePoolMock");
    Zap = await ethers.getContractFactory("ZkSyncBridgeSwapper");
    lido = await Lido.deploy();
    wstETH = await WstETH.deploy(lido.address);
    zkSync = await ZkSync.deploy(wstETH.address);
    curve = await Curve.deploy(lido.address);
  })

  async function sendETH(recipient, amount) {
    await deployer.sendTransaction({ to: recipient, value: amount });
  }

  async function sendWstETH(recipient, amount) {
    await lido.submit(ethers.constants.AddressZero, {value: amount});
    await lido.approve(wstETH.address, amount);
    await wstETH.wrap(amount);
    await wstETH.transfer(recipient, amount);
  }

  beforeEach(async function() {
    zap = await Zap.deploy(
      zkSync.address,
      l2Account.address,
      wstETH.address,
      curve.address,
      ethers.constants.AddressZero
    );
    // send 1 ETH to the ZkSync contract
    await sendETH(zkSync.address, ethers.utils.parseEther("1.0"));
    // send 1 wrapped stETH to ZkSync contract
    await sendWstETH(zkSync.address, ethers.utils.parseEther("1.0"));
    // send 1 ETH to the curve pool
    await sendETH(curve.address, ethers.utils.parseEther("1.0"));
    // send 1 ETH to the Zap contract
    await sendETH(zap.address, ethers.utils.parseEther("1.0"));
    // send 1 wrapped stETH to Zap contract
    await sendWstETH(zap.address, ethers.utils.parseEther("1.0"));
  });

  it("Should init the environment", async function () {
    expect(await ethers.provider.getBalance(zkSync.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await wstETH.balanceOf(zkSync.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await ethers.provider.getBalance(curve.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await ethers.provider.getBalance(zap.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await wstETH.balanceOf(zap.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await zap.owner()).to.equal(deployer.address);
  });

  it("Should swap wrapped stETH when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await zkSync.setPendingBalance(wstETH.address, 0);
    await zap.swapStEthForEth(amountIn);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap wrapped stETH when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await zkSync.setPendingBalance(wstETH.address, ethers.utils.parseEther("0.1"));
    await zap.swapStEthForEth(amountIn);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(ethers.constants.AddressZero, wstETH.address)).to.equal(0);
  });

  it("Should emit event when swapping wrapped stETH for ETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await expect(zap.swapStEthForEth(amountIn)).to.emit(zap, "Swapped");
  });

  it("Should swap ETH for wrapped stETH when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zkSync.setPendingBalance(ethers.constants.AddressZero, 0);
    await zap.swapEthForStEth(amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap ETH for wrapped stETH when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zkSync.setPendingBalance(ethers.constants.AddressZero, ethers.utils.parseEther("0.1"));
    await zap.swapEthForStEth(amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(ethers.constants.AddressZero, ethers.constants.AddressZero)).to.equal(0);
  });

  it("Should emit event when swapping ETH for wrapped stETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await expect(zap.swapStEthForEth(amountIn)).to.emit(zap, "Swapped");
  });

  it("Should recover ETH", async function () {
    const ownerBalance = await ethers.provider.getBalance(deployer.address);
    await zap.recoverToken(ethers.constants.AddressZero);
    const ownerBalanceAfter = await ethers.provider.getBalance(deployer.address);
    expect(await ethers.provider.getBalance(zap.address)).to.equal(0);
    expect(ownerBalanceAfter).to.be.gt(ownerBalance);
  });

  it("Should recover ERC20", async function () {
    const ownerBalance = await wstETH.balanceOf(deployer.address);
    await zap.recoverToken(wstETH.address);
    const ownerBalanceAfter = await wstETH.balanceOf(deployer.address);
    expect(await wstETH.balanceOf(zap.address)).to.equal(0);
    expect(ownerBalanceAfter).to.be.gt(ownerBalance);
  });

  it("Should change the owner", async function () {
    await zap.changeOwner(newOwner.address);
    expect(await zap.owner()).to.equal(newOwner.address);
  });

  it("Should fail to change the owner from a non owner account", async function () {
    await expect(zap.connect(newOwner).changeOwner(newOwner.address)).to.revertedWith("unauthorised");
  });

  it("Should fail to change the owner to 0 address", async function () {
    await expect(zap.changeOwner(ethers.constants.AddressZero)).to.revertedWith("invalid input");
  });
});
