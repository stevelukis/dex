import { ethers } from "hardhat";
import { ContractReceipt } from "ethers";

export const ethToWei = (n: number | string) => {
    return ethers.utils.parseUnits(n.toString(), 'ether');
}

export const getBlockTimestampFromReceipt = async (receipt: ContractReceipt) => {
    return (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
}