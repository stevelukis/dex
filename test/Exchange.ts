import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';
import { Exchange } from '../typechain-types';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

const ethToWei = (n: number | string) => {
    return ethers.utils.parseUnits(n.toString(), 'ether');
}

describe('Exchange', function () {
    const deployExchangeFixture = async () => {
        const [owner, feeAccount, user1] = await ethers.getSigners();

        const feePercent = 10;

        const Exchange: ContractFactory = await ethers.getContractFactory('Exchange');
        const exchangeContract = await Exchange.deploy(feeAccount.address, feePercent);
        const exchange: Exchange = await ethers.getContractAt('Exchange', exchangeContract.address);

        const Token = await ethers.getContractFactory('Token');
        const token1Contract = await Token.deploy('Dapp University', 'DAPP', ethToWei('1000000'));
        const token1 = await ethers.getContractAt('Token', token1Contract.address);

        await token1.transfer(user1.address, ethToWei(100))

        return { owner, feeAccount, user1, feePercent, exchange, token1 };
    };

    describe('Deployment', function () {
        it('Should return the correct fee account', async function () {
            const { exchange, feeAccount } = await loadFixture(deployExchangeFixture);
            expect(await exchange.feeAccount()).to.be.equal(feeAccount.address);
        });

        it('Should return the correct fee percentage', async function () {
            const { exchange, feePercent } = await loadFixture(deployExchangeFixture);
            expect(await exchange.feePercent()).to.be.equal(feePercent);
        });
    });

    describe('Depositing Tokens', function () {
        describe('Success', function () {
            async function depositTokenFixture() {
                const deployStuffs = await loadFixture(deployExchangeFixture);
                const { exchange, token1, user1 } = deployStuffs;

                const amount = ethToWei(10);

                await token1.connect(user1).approve(exchange.address, amount);
                await exchange.connect(user1).depositToken(token1.address, amount);
                return { ...deployStuffs, amount }
            }

            it('Should transfer the token to the exchange and save the balance', async function () {
                const { exchange, token1, amount, user1 } = await loadFixture(depositTokenFixture);

                expect(await token1.balanceOf(exchange.address)).to.equal(amount);
                expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount);
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount);
            });
        });

        describe('Failure', function () {
            it('Should be reverted when no tokens are approved', async function () {
                const { exchange, user1, token1 } = await loadFixture(deployExchangeFixture);
                await expect(exchange.connect(user1).depositToken(token1.address, 10))
                    .to.be.revertedWith('ERC20: transfer amount exceeds allowance');
            })
        });
    });
});