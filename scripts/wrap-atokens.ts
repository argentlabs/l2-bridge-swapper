import hre, { ethers } from "hardhat";
const ConfigLoader = require("./utils/configurator-loader.js");

const configLoader = new ConfigLoader(hre.network.name);
const config = configLoader.load();

const maxFeePerGas = ethers.utils.parseUnits("60", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("1.5", "gwei"); // "priority fee" on blocknative

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer is ${signer.address} holding ETH ${ethers.utils.formatEther(balance)}`);


    const stataDai = await ethers.getContractAt("IStaticATokenLM", config.stataDai);
    const aDai = await ethers.getContractAt("IERC20", await stataDai.ATOKEN());

    const aDaiBalance = await aDai.balanceOf(signer.address);
    console.log(`aDAI balance ${ethers.utils.formatEther(aDaiBalance)}`)

    console.log(`stataDAI balance ${ethers.utils.formatEther(await stataDai.balanceOf(signer.address))}`)
    await aDai.approve(stataDai.address, aDaiBalance);
    const aDaiAmount = ethers.utils.parseEther("1000");
    await stataDai.deposit(signer.address, aDaiAmount, 0, false);
    console.log(`stataDAI balance ${ethers.utils.formatEther(await stataDai.balanceOf(signer.address))}`)


    const stataUsdc = await ethers.getContractAt("IStaticATokenLM", config.stataUsdc);
    const aUsdc = await ethers.getContractAt("IERC20", await stataUsdc.ATOKEN());

    const aUsdcBalance = await aUsdc.balanceOf(signer.address);
    const aUsdcAmount = aUsdcBalance.sub(500);
    console.log(`aUSDC balance ${ethers.utils.formatUnits(aUsdcBalance, 6)}`)
    console.log(`aUSDC amount  ${ethers.utils.formatUnits(aUsdcAmount, 6)}`)

    console.log(`stataUSDC balance ${ethers.utils.formatUnits(await stataUsdc.balanceOf(signer.address), 6)}`)
    await aUsdc.approve(stataUsdc.address, aUsdcBalance);
    await stataUsdc.deposit(signer.address, aUsdcAmount, 0, false);
    console.log(`stataUSDC balance ${ethers.utils.formatUnits(await stataUsdc.balanceOf(signer.address), 6)}`)


  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
