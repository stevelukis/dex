import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { deployExchangeFixture, depositTokenFixture, withdrawTokenFixture } from './fixtures';

describe('Exchange', function () {
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
            });
        });
    });

    describe('Withdraw tokens', function () {
        describe('Success', function () {
            it('Should withdraw token funds', async function () {
                const { exchange, token1, user1 } = await loadFixture(withdrawTokenFixture);

                expect(await token1.balanceOf(exchange.address)).to.equal(0);
                expect(await exchange.tokens(token1.address, user1.address)).to.equal(0);
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0);
            });

            it('Should emits a Withdraw event', async function () {
                const { exchange, token1, user1, amount } = await depositTokenFixture();
                await expect(exchange.connect(user1).withdrawToken(token1.address, amount))
                    .to.emit(exchange, 'Withdraw')
                    .withArgs(token1.address, user1.address, amount, 0);
            });
        });
        
        describe('Failure', function () {
            it('Should be reverted when the token balance is insufficient', async function () {
                const { exchange, user1, token1 } = await loadFixture(deployExchangeFixture);
                await expect(exchange.connect(user1).withdrawToken(token1.address, 10))
                    .to.be.revertedWith('Amount exceeds token balance');
            });
        });
    });
});