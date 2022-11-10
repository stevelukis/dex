import { ethers } from "hardhat";

export const ethToWei = (n: number | string) => {
    return ethers.utils.parseUnits(n.toString(), 'ether');
}