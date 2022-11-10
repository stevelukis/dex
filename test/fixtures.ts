import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import { ethToWei } from "./utils";

export const deployExchangeFixture = async () => {
    const [owner, feeAccount, user1] = await ethers.getSigners();

    const feePercent = 10;

    const Exchange: ContractFactory = await ethers.getContractFactory('Exchange');
    const exchangeContract = await Exchange.deploy(feeAccount.address, feePercent);
    const exchange = await ethers.getContractAt('Exchange', exchangeContract.address);

    const Token = await ethers.getContractFactory('Token');
    const token1Contract = await Token.deploy('Dapp University', 'DAPP', ethToWei('1000000'));
    const token1 = await ethers.getContractAt('Token', token1Contract.address);

    await token1.transfer(user1.address, ethToWei(100))

    return { owner, feeAccount, user1, feePercent, exchange, token1 };
};

export const depositTokenFixture = async () => {
    const stuffs = await deployExchangeFixture();
    const { exchange, token1, user1 } = stuffs;

    const amount = ethToWei(10);

    await token1.connect(user1).approve(exchange.address, amount);
    await exchange.connect(user1).depositToken(token1.address, amount);
    return { ...stuffs, amount }
}

export const withdrawTokenFixture = async () => {
    const stuffs = await depositTokenFixture();
    const { exchange, token1, user1, amount } = stuffs;

    await exchange.connect(user1).withdrawToken(token1.address, amount);

    return stuffs;
}