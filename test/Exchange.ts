import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import { Exchange } from "../typechain-types";

describe("Exchange", function () {
    const deployExchangeFixture = async () => {
        const [owner, feeAccount] = await ethers.getSigners();

        const feePercent = 10;

        const Exchange: ContractFactory = await ethers.getContractFactory("Exchange");
        const exchangeContract = await Exchange.deploy(feeAccount.address, feePercent);
        const exchange: Exchange = await ethers.getContractAt("Exchange", exchangeContract.address);

        return { owner, feeAccount, feePercent, exchange };
    };
});