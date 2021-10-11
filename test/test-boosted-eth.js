const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Boosted ETH Bridge Swapper", function () {

  let zap;
  let zkSync;
  let l2Account;
  let deployer;
  let newOwner;

  let lido;
  let stEthPool;
  let crvStEth;
  let yvCrvStEth;

  const amount = ethers.utils.parseEther("1.0");

  before(async function() {
    [deployer, l2Account, newOwner] = await ethers.getSigners();
    Zap = await ethers.getContractFactory("BoostedEthBridgeSwapper");
    ZkSync = await ethers.getContractFactory("ZKSyncMock");
    Lido = await ethers.getContractFactory("LidoMock");
    Curve = await ethers.getContractFactory("CurvePoolMock");
    YearnVault = await ethers.getContractFactory("YearnVaultMock");
    ERC20 = await ethers.getContractFactory("ERC20MintableBurnable");
    lido = await Lido.deploy();
    crvStEth = await ERC20.deploy("Curve stETH LP Token", "crvStETH")
    stEthPool = await Curve.deploy(lido.address, crvStEth.address);
    yvCrvStEth = await YearnVault.deploy(crvStEth.address);
    zkSync = await ZkSync.deploy();
  })

  async function sendETH(recipient, amount) {
    await deployer.sendTransaction({ to: recipient, value: amount });
  }

  async function sendYvCrvStETH(recipient, amount) {
    await yvCrvStEth.mint(recipient, amount);
  }

  beforeEach(async function() {
    zap = await Zap.deploy(
      zkSync.address,
      l2Account.address,
      yvCrvStEth.address,
      stEthPool.address,
      ethers.constants.AddressZero,
    );
    await sendETH(zkSync.address, amount);
    await sendYvCrvStETH(zkSync.address, amount);
    await sendETH(stEthPool.address, amount);
    await sendYvCrvStETH(stEthPool.address, amount);
    await sendETH(zap.address, amount);
    await sendYvCrvStETH(zap.address, amount);
    await crvStEth.mint(yvCrvStEth.address, amount);
  });

  it("Should init the environment", async function () {
    expect(await ethers.provider.getBalance(zkSync.address)).to.equal(amount);
    expect(await yvCrvStEth.balanceOf(zkSync.address)).to.equal(amount);
    expect(await ethers.provider.getBalance(stEthPool.address)).to.equal(amount);
    expect(await ethers.provider.getBalance(zap.address)).to.equal(amount);
    expect(await yvCrvStEth.balanceOf(zap.address)).to.equal(amount);
    expect(await zap.owner()).to.equal(deployer.address);
  });

  it("Should swap yvCrvStEth for ETH when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await zkSync.setPendingBalance(zap.address, yvCrvStEth.address, 0);
    await zap.exchange(1, 0, amountIn);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap yvCrvStEth for ETH when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const ethDepositedBefore = await zkSync.getDepositedETH(l2Account.address);
    await zkSync.setPendingBalance(zap.address, yvCrvStEth.address, ethers.utils.parseEther("0.1"));
    await zap.exchange(1, 0, amountIn);
    const ethDepositedAfter = await zkSync.getDepositedETH(l2Account.address);
    expect(ethDepositedAfter.sub(ethDepositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(zap.address, yvCrvStEth.address)).to.equal(0);
  });

  it("Should emit event when swapping yvCrvStEth for ETH", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(1, 0, amountIn)).to.emit(zap, "Swapped");
  });

  it("Should swap ETH for yvCrvStETH when there is no pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(yvCrvStEth.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, ethers.constants.AddressZero, 0);
    await zap.exchange(0, 1, amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(yvCrvStEth.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
  });

  it("Should swap ETH for yvCrvStEth when there is a pending balance", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    const tokenDepositedBefore = await zkSync.getDepositedERC20(yvCrvStEth.address, l2Account.address);
    await zkSync.setPendingBalance(zap.address, ethers.constants.AddressZero, ethers.utils.parseEther("0.1"));
    await zap.exchange(0, 1, amountIn);
    const tokenDepositedAfter = await zkSync.getDepositedERC20(yvCrvStEth.address, l2Account.address);
    expect(tokenDepositedAfter.sub(tokenDepositedBefore)).to.equal(amountIn);
    expect(await zkSync.getPendingBalance(zap.address, ethers.constants.AddressZero)).to.equal(0);
  });

  it("Should emit event when swapping ETH for yvCrvStEth", async function () {
    const amountIn = ethers.utils.parseEther("0.5");
    await expect(zap.exchange(0, 1, amountIn)).to.emit(zap, "Swapped");
  });
});
