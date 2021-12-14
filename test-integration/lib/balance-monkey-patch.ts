import { BigNumberish } from "ethers";
import hre, { ethers } from "hardhat";

const abi = ethers.utils.defaultAbiCoder;
const probeAddress = ethers.constants.AddressZero;
const probeAmount1 = abi.encode(["uint256"], [1]);
const probeAmount2 = abi.encode(["uint256"], [2]);

const cache: Record<string, number> = {};

/**
 * @param mappingSlot Slot index of `balances` in the token contract
 * @param account The account we want the balance from
 * @returns The slot number used to store `balances[account]` if the `balances` mapping is
 * stored at slot `mappingSlot`
 */
const balanceValueSlot = (mappingSlot: number, account: string) => {
  const balanceSlot = ethers.utils.keccak256(abi.encode(["address", "uint256"], [account, mappingSlot]));
  return balanceSlot.replace(/^0x0+/, "0x"); // hardhat doesn't like zero-padding
};

/**
 * Finds the storage slot of the mapping holding ERC-20 balances, if such a simple mapping is
 * used in this contract. Throws otherwise.
 * @param tokenAddress ERC-20 address
 * @returns Storage slot number for the balances mapping
 */
const findBalancesSlot = async (tokenAddress: string) => {
  const token = await ethers.getContractAt("IERC20", tokenAddress);

  for (let index = 0; index < 100; index++) {
    const probedSlot = balanceValueSlot(index, probeAddress);

    const prevAmount = await hre.network.provider.send("eth_getStorageAt", [tokenAddress, probedSlot, "latest"]);
    const probeAmount = prevAmount === probeAmount1 ? probeAmount2 : probeAmount1;

    await hre.network.provider.send("hardhat_setStorageAt", [tokenAddress, probedSlot, probeAmount]);
    const maybeChangedBalance = await token.balanceOf(probeAddress);
    await hre.network.provider.send("hardhat_setStorageAt", [tokenAddress, probedSlot, prevAmount]);

    if (maybeChangedBalance.eq(probeAmount)) {
      return index;
    }
  }

  throw "Balances slot not found!";
};

/**
 * Changes an account's ERC-20 balance
 * @param tokenAddress The ERC-20's address
 * @param accountAddress The account to change balance
 * @param balance The new balance
 */
export const setTokenBalance = async (tokenAddress: string, accountAddress: string, balance: BigNumberish) => {
  let slot = cache[tokenAddress];
  if (!slot) {
    slot = await findBalancesSlot(tokenAddress);
    cache[tokenAddress] = slot;
  }

  const balanceSlot = balanceValueSlot(slot, accountAddress);
  const balanceAmount = abi.encode(["uint256"], [ethers.BigNumber.from(balance)]);
  await hre.network.provider.send("hardhat_setStorageAt", [tokenAddress, balanceSlot, balanceAmount]);
};
