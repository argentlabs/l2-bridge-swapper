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

  before(async function() {
    [deployer, l2Account] = await ethers.getSigners();
    Lido = await ethers.getContractFactory("LidoMock");
    WstETH = await ethers.getContractFactory("WstETHMock");
    ZkSync = await ethers.getContractFactory("ZKSyncMock");
    Curve = await ethers.getContractFactory("CurvePoolMock");
    Zap = await ethers.getContractFactory("ZkSyncBridgeSwapper");
    lido = await Lido.deploy();
    wstETH = await WstETH.deploy(lido.address);
    zkSync = await ZkSync.deploy(wstETH.address);
    curve = await Curve.deploy(lido.address);
    zap = await Zap.deploy(
      zkSync.address,
      l2Account.address,
      wstETH.address,
      curve.address,
      ethers.constants.AddressZero
    );
  })

  beforeEach(async function() {
    // send 1 ETH to zkSync contract
    await deployer.sendTransaction({ to: zkSync.address, value: ethers.utils.parseEther("1.0") });
    // send 1 wrapped stETH to zkSync contract
    await lido.submit(ethers.constants.AddressZero, {value: ethers.utils.parseEther("1.0")});
    await lido.approve(wstETH.address, ethers.utils.parseEther("1.0"));
    await wstETH.wrap(ethers.utils.parseEther("1.0"));
    await wstETH.transfer(zkSync.address, ethers.utils.parseEther("1.0"));
    // send 1 ETH to the curve pool
    await deployer.sendTransaction({ to: curve.address, value: ethers.utils.parseEther("1.0") });
  });

  it("Should init the environment", async function () {
    expect(await ethers.provider.getBalance(zkSync.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await wstETH.balanceOf(zkSync.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await ethers.provider.getBalance(curve.address)).to.equal(ethers.utils.parseEther("1.0"));
  });

  it("Should swap wrapped stETH for ETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await zap.swapStEthForEth(amountIn, 1);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
  });

  it("Should emit event when swapping wrapped stETH for ETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await expect(zap.swapStEthForEth(amountIn, 1)).to.emit(zap, "Swapped");
  });

  it("Should fail to swap wrapped stETH for ETH when amount out is too low", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const amountOut = ethers.utils.parseEther("0.6");
    await expect(zap.swapStEthForEth(amountIn, amountOut)).to.be.revertedWith("dy too low");
  });

  it("Should swap ETH for wrapped stETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zap.swapEthForStEth(amountIn, 1);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
  });

  it("Should emit event when swapping ETH for wrapped stETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await expect(zap.swapStEthForEth(amountIn, 1)).to.emit(zap, "Swapped");
  });

  it("Should fail to swap ETH for wrapped stETH when amount out is too low", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const amountOut = ethers.utils.parseEther("0.6");
    await expect(zap.swapEthForStEth(amountIn, amountOut)).to.be.revertedWith("out too small");
  });

  it("Should not accept ETH", async function () {
    await expect(deployer.sendTransaction({ to: zap.address, value: ethers.utils.parseEther("1.0") })).to.be.revertedWith("no ETH transfer");
  });

  it("Should recover stETH", async function () {
    // send 1 stETH to the zap contract
    await lido.submit(ethers.constants.AddressZero, {value: ethers.utils.parseEther("1.0")});
    await lido.transfer(zap.address, ethers.utils.parseEther("1.0"));
    expect(await lido.balanceOf(zap.address)).to.equal(ethers.utils.parseEther("1.0"));
    // recover the stETH
    const balance = await lido.balanceOf(zap.address);
    const tokenDepositeBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zap.recoverToken(lido.address);
    expect(await lido.balanceOf(zap.address)).to.equal(0);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositeBefore)).to.equal(balance);
  });

  it("Should recover wstETH", async function () {
    // send 1 wstETH to the zap contract
    await lido.submit(ethers.constants.AddressZero, {value: ethers.utils.parseEther("1.0")});
    await lido.approve(wstETH.address, ethers.utils.parseEther("1.0"));
    await wstETH.wrap(ethers.utils.parseEther("1.0"));
    await wstETH.transfer(zap.address, ethers.utils.parseEther("1.0"));
    // recover the wstETH
    const balance = await wstETH.balanceOf(zap.address);
    const tokenDepositeBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zap.recoverToken(wstETH.address);
    expect(await wstETH.balanceOf(zap.address)).to.equal(0);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositeBefore)).to.equal(balance);
  });
});
