import { BigNumberish } from "ethers";
import hre, { ethers } from "hardhat";

const abi = ethers.utils.defaultAbiCoder;
const probeAddress = ethers.constants.AddressZero;
const probeAmount1 = abi.encode(["uint256"], [1]);
const probeAmount2 = abi.encode(["uint256"], [2]);

/**
 * @param mappingSlot Slot index of `balances` in the token contract
 * @param account The account we want the balance from
 * @returns The slot number used to store `balances[account]` if the `balances` mapping is
 * stored at slot `mappingSlot`
 */
const balanceSlotAtIndex = (mappingSlot: number, account: string) => {
  const balanceSlot = ethers.utils.keccak256(abi.encode(["address", "uint256"], [account, mappingSlot]));
  return balanceSlot.replace("0x0", "0x"); // hardhat doesn't like zero-padding
};

/**
 * Changes an account's ERC-20 balance
 * @param tokenAddress The ERC-20's address
 * @param accountAddress The account to change balance
 * @param balance The new balance
 */
export const setTokenBalance = async (tokenAddress: string, accountAddress: string, balance: BigNumberish) => {
  const token = await ethers.getContractAt("IERC20", tokenAddress);

  for (let index = 0; index < 100; index++) {
    const probedSlot = balanceSlotAtIndex(index, probeAddress);

    const prevAmount = await hre.network.provider.send("eth_getStorageAt", [tokenAddress, probedSlot, "latest"]);
    const probeAmount = prevAmount === probeAmount1 ? probeAmount2 : probeAmount1;

    await hre.network.provider.send("hardhat_setStorageAt", [tokenAddress, probedSlot, probeAmount]);

    const maybeChangedBalance = await token.balanceOf(probeAddress);
    if (maybeChangedBalance.eq(probeAmount)) {
      const balanceSlot = balanceSlotAtIndex(index, accountAddress);
      const balanceAmount = abi.encode(["uint256"], [ethers.BigNumber.from(balance)]);
      await hre.network.provider.send("hardhat_setStorageAt", [tokenAddress, balanceSlot, balanceAmount]);
      return;
    } else {
      await hre.network.provider.send("hardhat_setStorageAt", [tokenAddress, probedSlot, prevAmount]);
    }
  }

  throw "Balances slot not found!";
};
