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

    const yvDai = await ethers.getContractAt("IYearnVault", config.yvDai);
    const dai = await ethers.getContractAt("IERC20", await yvDai.token());

    console.log(`DAI balance ${ethers.utils.formatEther(await dai.balanceOf(signer.address))}`)

    let tx, estimation
    // const daiAmount = ethers.utils.parseEther("1000");
    // estimation = await dai.estimateGas.approve(config.zkSyncTokenGovernance, daiAmount, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`approve gas estimation ${estimation}`);
    // tx = await dai.approve(config.zkSyncTokenGovernance, daiAmount, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`tx ${tx.hash}`);

    const token = config.stataUsdc;

    const abi = ["function addToken(address _token) external"];
    const contract = new ethers.Contract(config.zkSyncTokenGovernance, abi, signer);

    // estimation = await contract.estimateGas.addToken(token, { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 200_000 });
    // console.log(`addToken gas estimation ${estimation}`);
    tx = await contract.addToken(token, { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 200_000 });
    console.log(`tx ${tx.hash}`);
    // await tx.wait();

    // console.log(`DAI balance ${ethers.utils.formatEther(await dai.balanceOf(signer.address))}`)

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
