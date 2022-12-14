import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import {
    cancelOrderFixture,
    deployExchangeFixture,
    depositTokenFixture,
    fillOrderFixture,
    makeOrderFixture,
    withdrawTokenFixture
} from './fixtures';
import { BigNumber } from 'ethers';
import { ethToWei } from './utils';

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

            it('Should emits a Deposit event', async () => {
                const { exchange, token1, user1, amount, depositTx } = await loadFixture(depositTokenFixture);
                await expect(depositTx)
                    .to.emit(exchange, 'Deposit')
                    .withArgs(token1.address, user1.address, amount, amount);
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

    describe('Cancel order', () => {
        describe('Success', () => {
            it('Should track the cancelled order', async () => {
                const { exchange, user1 } = await loadFixture(cancelOrderFixture);
                expect(await exchange.connect(user1).orderCancelled(1)).to.be.true;
            });

            it('Should emit cancel event', async () => {
                const {
                    exchange,
                    token1,
                    token2,
                    user1,
                    amountGet,
                    amountGive,
                    tx,
                    blockTimestamp
                } = await loadFixture(cancelOrderFixture);

                expect(tx)
                    .to.emit(exchange, 'Cancel')
                    .withArgs(
                        1,
                        user1.address,
                        token2.address,
                        amountGet,
                        token1.address,
                        amountGive,
                        blockTimestamp)
            });
        });

        describe('Failure', () => {
            it('Should be reverted if the order id is invalid', async () => {
                const { exchange, user1 } = await loadFixture(makeOrderFixture);
                await expect(exchange.connect(user1).cancelOrder(9999))
                    .to.be.revertedWith('Order doesn\'t exist');
            });

            it('Should be reverted on unauthorized cancellations', async () => {
                const { exchange } = await loadFixture(makeOrderFixture);
                await expect(exchange.cancelOrder(1))
                    .to.be.revertedWith('Only the order maker can cancel the order');
            })
        });
    });

    describe.only('Fill order', () => {
        describe('Success', () => {
            it('Should return the correct balances', async () => {
                const {
                    exchange,
                    token1,
                    token2,
                    user1,
                    user2,
                    feeAccount,
                    feeAmount,
                    amountGive,
                    amountGet
                } = await loadFixture(fillOrderFixture);

                // Token1 Balances
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(ethToWei(0));
                expect(await exchange.balanceOf(token1.address, user2.address)).to.equal(amountGive);
                expect(await exchange.balanceOf(token1.address, feeAccount.address)).to.equal(ethToWei(0));

                // Token2 Balances
                expect(await exchange.balanceOf(token2.address, user1.address)).to.equal(amountGet);
                expect(await exchange.balanceOf(token2.address, user2.address)).to.equal(0);
                expect(await exchange.balanceOf(token2.address, feeAccount.address)).to.equal(feeAmount);
            });

            it('Should tracks filled order', async () => {
                const { exchange } = await loadFixture(fillOrderFixture);
                expect(await exchange.orderFilled(1)).to.be.true;
            });

            it('Should emit Trade event', async () => {
                const {
                    exchange,
                    tx,
                    user1,
                    user2,
                    token1,
                    token2,
                    blockTimestamp,
                    amountGet,
                    amountGive
                } = await loadFixture(fillOrderFixture);

                expect(tx)
                    .to.emit(exchange, 'Cancel')
                    .withArgs(
                        1,
                        user2.address,
                        token2.address,
                        amountGet,
                        token1.address,
                        amountGive,
                        user1.address,
                        blockTimestamp
                    );
            });
        });

        describe('Failure', async () => {
            it('Should revert on invalid order id', async () => {
                const { exchange, user2 } = await loadFixture(makeOrderFixture);
                await expect(exchange.connect(user2).fillOrder(99999))
                    .to.be.revertedWith('Order does not exist');
            });

            it('Should revert if order is filled', async () => {
                const { exchange, user2 } = await loadFixture(fillOrderFixture);
                await expect(exchange.connect(user2).fillOrder(1))
                    .to.be.revertedWith('Order has been filled');
            });

            it('Should revert on invalid order id', async () => {
                const { exchange, user2 } = await loadFixture(cancelOrderFixture);
                await expect(exchange.connect(user2).fillOrder(1))
                    .to.be.revertedWith('Order has been cancelled');
            });
        });
    });
});