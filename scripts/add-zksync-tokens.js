const hre = require("hardhat");

const { ethers } = hre;

const maxFeePerGas = ethers.utils.parseUnits("110", "gwei"); // "base fee + priority fee" on blocknative
const maxPriorityFeePerGas = ethers.utils.parseUnits("1.5", "gwei"); // "priority fee" on blocknative

const stealDai = async (dai, to, amount) => {
  const daiWhale = dai.address;

  await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [daiWhale] });

  const quantity = ethers.utils.parseEther("100").toHexString().replace("0x0", "0x");
  await hre.network.provider.request({ method: "hardhat_setBalance", params: [daiWhale, quantity] });

  const daiSigner = await ethers.getSigner(dai.address);
  await dai.connect(daiSigner).transfer(to, amount, { from: dai.address });
};

(async () => {
  try {
    const [signer] = await ethers.getSigners();
    console.log(`Signer is ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer ETH balance is: ${ethers.utils.formatEther(balance)}`);

    const yvDai = await ethers.getContractAt("IYearnVault", config.yvDai);
    const dai = await ethers.getContractAt("IERC20", await yvDai.token());

    console.log(`DAI balance ${ethers.utils.formatEther(await dai.balanceOf(signer.address))}`)
    // await stealDai(dai, signer.address, ethers.utils.parseEther("100"));
    // console.log(`DAI balance ${ethers.utils.formatEther(await dai.balanceOf(signer.address))}`)

    // const daiAmount = ethers.utils.parseEther("300");
    // let estimation = await dai.estimateGas.approve(config.zkSyncTokenGovernance, daiAmount, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`approve gas estimation ${estimation}`);
    // let tx = await dai.approve(config.zkSyncTokenGovernance, daiAmount, { nonce: 8, maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`tx ${tx.hash}`);

    const tokens = [
      "0x5f18c75abdae578b483e5f43f12a39cf75b973a9", 
      "0xda816459f1ab5631232fe5e97a05bbbb94970c95", 
      "0xdcd90c7f6324cfa40d7169ef80b12031770b4325",
      "0xa696a63cc78dffa1a63e9e50587c197387ff6c7e",
      "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
      "0x3adb04e127b9c0a5d36094125669d4603ac52a0c",
    ]
    const i = 5;
    const token = tokens[i];

    const abi = ["function addToken(address _token) external"];
    const contract = new ethers.Contract(config.zkSyncTokenGovernance, abi, signer);

    // estimation = await contract.estimateGas.addToken(token, { maxFeePerGas, maxPriorityFeePerGas });
    // console.log(`addToken gas estimation ${estimation}`);
    let tx = await contract.addToken(token, { maxFeePerGas, maxPriorityFeePerGas });
    console.log(`index ${i} tx ${tx.hash}`);
    // await tx.wait();

    // console.log(`DAI balance ${ethers.utils.formatEther(await dai.balanceOf(signer.address))}`)

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
