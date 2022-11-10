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

    const token2Contract = await Token.deploy('Mock Dai', 'mDAI', ethToWei('1000000'));
    const token2 = await ethers.getContractAt('Token', token2Contract.address);

    await token1.transfer(user1.address, ethToWei(100))

    return { owner, feeAccount, user1, feePercent, exchange, token1, token2 };
};

export const depositTokenFixture = async () => {
    const stuffs = await deployExchangeFixture();
    const { exchange, token1, user1 } = stuffs;

    const amount = ethToWei(10);

    await token1.connect(user1).approve(exchange.address, amount);
    const depositTx = await exchange.connect(user1).depositToken(token1.address, amount);
    return { ...stuffs, amount, depositTx }
}

export const withdrawTokenFixture = async () => {
    const stuffs = await depositTokenFixture();
    const { exchange, token1, user1, amount } = stuffs;

    const withdrawTx = await exchange.connect(user1).withdrawToken(token1.address, amount);

    return { ...stuffs, withdrawTx };
}

export const makeOrderFixture = async () => {
    const stuffs = await depositTokenFixture();
    const { exchange, token1, token2, user1, amount } = stuffs;

    const amountGet = ethToWei(1);
    const amountGive = amount;

    const makeOrderTx = await exchange.connect(user1).makeOrder(token2.address, amountGet, token1.address, amountGive);
    const receipt = await makeOrderTx.wait();
    const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

    return { ...stuffs, amountGet, amountGive, makeOrderTx, blockTimestamp };
}