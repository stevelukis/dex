import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import { ethToWei, getBlockTimestampFromReceipt } from "./utils";

export const deployExchangeFixture = async () => {
    const [owner, feeAccount, user1, user2] = await ethers.getSigners();
    const feePercent = 10;

    const Exchange: ContractFactory = await ethers.getContractFactory('Exchange');
    const exchangeContract = await Exchange.deploy(feeAccount.address, feePercent);
    const exchange = await ethers.getContractAt('Exchange', exchangeContract.address);

    const Token = await ethers.getContractFactory('Token');
    const token1Contract = await Token.deploy('Dapp University', 'DAPP', ethToWei('1000000'));
    const token1 = await ethers.getContractAt('Token', token1Contract.address);

    const token2Contract = await Token.deploy('Mock Dai', 'mDAI', ethToWei('1000000'));
    const token2 = await ethers.getContractAt('Token', token2Contract.address);

    await token1.transfer(user1.address, ethToWei(100));
    await token2.transfer(user2.address, ethToWei(100));

    return { owner, feeAccount, user1, user2, feePercent, exchange, token1, token2 };
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

    const tx = await exchange.connect(user1).withdrawToken(token1.address, amount);

    return { ...stuffs, tx };
}

export const makeOrderFixture = async () => {
    const stuffs = await depositTokenFixture();
    const { exchange, token1, token2, user1, amount } = stuffs;

    const amountGet = ethToWei(1);
    const amountGive = amount;

    const tx = await exchange.connect(user1).makeOrder(token2.address, amountGet, token1.address, amountGive);
    const blockTimestamp = getBlockTimestampFromReceipt(await tx.wait());

    return { ...stuffs, amountGet, amountGive, tx, blockTimestamp };
}

export const cancelOrderFixture = async () => {
    const stuffs = await makeOrderFixture();
    const { exchange, user1 } = stuffs;

    const tx = await exchange.connect(user1).cancelOrder(1);
    const blockTimestamp = getBlockTimestampFromReceipt(await tx.wait());

    return { ...stuffs, tx, blockTimestamp };
}

export const fillOrderFixture = async () => {
    const stuffs = await makeOrderFixture();
    const { exchange, token2, user2, feePercent, amountGet } = stuffs;

    const feeAmount = amountGet.mul(feePercent).div(100);
    const depositAmount = amountGet.add(feeAmount);

    await token2.connect(user2).approve(exchange.address, depositAmount);
    await exchange.connect(user2).depositToken(token2.address, depositAmount);

    const tx = await exchange.connect(user2).fillOrder(1);
    const blockTimestamp = getBlockTimestampFromReceipt(await tx.wait());

    return { ...stuffs, tx, blockTimestamp, feeAmount };
}