const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lido Bridge Swapper", function () {

  let zap;
  let zkSync;
  let l2Account;
  let deployer;
  let newOwner;

  let lido;
  let curve;
  let wstETH;

  before(async function() {
    [deployer, l2Account, newOwner] = await ethers.getSigners();
    Zap = await ethers.getContractFactory("LidoBridgeSwapper");
    ZkSync = await ethers.getContractFactory("ZKSyncMock");
    Lido = await ethers.getContractFactory("LidoMock");
    WstETH = await ethers.getContractFactory("WstETHMock");
    Curve = await ethers.getContractFactory("CurvePoolMock");
    lido = await Lido.deploy();
    wstETH = await WstETH.deploy(lido.address);
    curve = await Curve.deploy(lido.address);
    zkSync = await ZkSync.deploy();
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
    await zkSync.setPendingBalance(zap.address, wstETH.address, 0);
    await zap.exchange(1, 0, amountIn);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap wrapped stETH when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await zkSync.setPendingBalance(zap.address, wstETH.address, ethers.utils.parseEther("0.1"));
    await zap.exchange(1, 0, amountIn);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(zap.address, wstETH.address)).to.equal(0);
  });

  it("Should emit event when swapping wrapped stETH for ETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(1, 0, amountIn)).to.emit(zap, "Swapped");
  });

  it("Should swap ETH for wrapped stETH when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, ethers.constants.AddressZero, 0);
    await zap.exchange(0, 1, amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap ETH for wrapped stETH when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, ethers.constants.AddressZero, ethers.utils.parseEther("0.1"));
    await zap.exchange(0, 1, amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(wstETH.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(zap.address, ethers.constants.AddressZero)).to.equal(0);
  });

  it("Should emit event when swapping ETH for wrapped stETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(1, 0, amountIn)).to.emit(zap, "Swapped");
  });

  describe("Common methods", async function () {
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

    it("Should change the slippage", async function () {
      await expect(zap.changeSlippage(2e6)).to.emit(zap, "SlippageChanged");
      expect(await zap.slippagePercent()).to.equal(2e6);
    });

    it("Should fail to change to an invalid slippage", async function () {
      await expect(zap.changeSlippage(1e6)).to.revertedWith("invalid slippage");
      await expect(zap.changeSlippage(101e6)).to.revertedWith("invalid slippage");
    });
  });
});
