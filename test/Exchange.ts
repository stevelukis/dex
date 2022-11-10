import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { deployExchangeFixture, depositTokenFixture, makeOrderFixture, withdrawTokenFixture } from './fixtures';
import { BigNumber } from 'ethers';

describe('Exchange', () => {
    describe('Deployment', () => {
        it('Should return the correct fee account', async () => {
            const { exchange, feeAccount } = await loadFixture(deployExchangeFixture);
            expect(await exchange.feeAccount()).to.be.equal(feeAccount.address);
        });

        it('Should return the correct fee percentage', async () => {
            const { exchange, feePercent } = await loadFixture(deployExchangeFixture);
            expect(await exchange.feePercent()).to.be.equal(feePercent);
        });
    });

    describe('Depositing Tokens', () => {
        describe('Success', () => {
            it('Should transfer the token to the exchange and save the balance', async () => {
                const { exchange, token1, amount, user1 } = await loadFixture(depositTokenFixture);

                expect(await token1.balanceOf(exchange.address)).to.equal(amount);
                expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount);
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount);
            });
        });

        describe('Failure', () => {
            it('Should be reverted when no tokens are approved', async () => {
                const { exchange, user1, token1 } = await loadFixture(deployExchangeFixture);
                await expect(exchange.connect(user1).depositToken(token1.address, 10))
                    .to.be.revertedWith('ERC20: transfer amount exceeds allowance');
            });
        });
    });

    describe('Withdraw tokens', () => {
        describe('Success', () => {
            it('Should withdraw token funds', async () => {
                const { exchange, token1, user1 } = await loadFixture(withdrawTokenFixture);

                expect(await token1.balanceOf(exchange.address)).to.equal(0);
                expect(await exchange.tokens(token1.address, user1.address)).to.equal(0);
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0);
            });

            it('Should emits a Withdraw event', async () => {
                const { exchange, token1, user1, amount, tx } = await loadFixture(withdrawTokenFixture);
                await expect(tx)
                    .to.emit(exchange, 'Withdraw')
                    .withArgs(token1.address, user1.address, amount, 0);
            });
        });

        describe('Failure', () => {
            it('Should be reverted when the token balance is insufficient', async () => {
                const { exchange, user1, token1 } = await loadFixture(deployExchangeFixture);
                await expect(exchange.connect(user1).withdrawToken(token1.address, 10))
                    .to.be.revertedWith('Amount exceeds token balance');
            });
        });
    });

    describe('Make order', () => {
        describe('Success', () => {
            it('Should return the correct order count', async () => {
                const { exchange } = await loadFixture(makeOrderFixture);
                expect(await exchange.orderCount()).to.equal(1);
            });

            it('Should save the order', async () => {
                const {
                    exchange,
                    token1,
                    token2,
                    user1,
                    amountGet,
                    amountGive,
                    blockTimestamp
                } = await loadFixture(makeOrderFixture);

                const order = await exchange.orders(1);

                expect(order[0]).to.equal(BigNumber.from(1));
                expect(order[1]).to.equal(user1.address);
                expect(order[2]).to.equal(token2.address);
                expect(order[3]).to.equal(amountGet);
                expect(order[4]).to.equal(token1.address);
                expect(order[5]).to.equal(amountGive);
                expect(order[6]).to.equal(BigNumber.from(blockTimestamp));
            });

            it('Should emit an Order event', async () => {
                const {
                    exchange,
                    token1,
                    token2,
                    user1,
                    amountGet,
                    amountGive,
                    tx,
                    blockTimestamp
                } = await loadFixture(makeOrderFixture);

                expect(tx)
                    .to.emit(exchange, 'Order')
                    .withArgs(
                        1,
                        user1.address,
                        token2.address,
                        amountGet,
                        token1.address,
                        amountGive,
                        blockTimestamp)
            })
        });
        describe('Failure', () => {
            it('Should be reverted if token balance is insufficient', async () => {
                const { exchange, user1, token1, token2 } = await loadFixture(deployExchangeFixture);
                await expect(exchange.connect(user1).makeOrder(token2.address, 1, token1.address, 10))
                    .to.be.revertedWith('Tokens deposited are not enough');
            });
        })
    });
});