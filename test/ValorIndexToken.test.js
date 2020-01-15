const { accounts, contract } = require('@openzeppelin/test-environment');

const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const ValorIndexToken = contract.fromArtifact('ValorIndexToken');

describe('ValorIndexToken', function () {
  const [ owner, unlocked, locked, normal ] = accounts;

  beforeEach(async function () {
    this.token = await ValorIndexToken.new({ from: owner });
  });

  describe('Only owner can', function () {
    it('freeze', async function () {
      await this.token.freeze({from: owner});
      expect(await this.token.freezed()).to.equal(true);
    });
    it('unfreeze', async function () {
      await this.token.freeze({from: owner});
      await this.token.unfreeze({from: owner});
      expect(await this.token.freezed()).to.equal(false);
    });
    it('lock address', async function () {
      await this.token.setLock(locked, true, {from: owner});
      expect(await this.token.lockedOf(locked)).to.equal(true);
    });
    it('unlock address', async function () {
      await this.token.setLock(locked, true, {from: owner});
      await this.token.setLock(locked, false, {from: owner});
      expect(await this.token.lockedOf(locked)).to.equal(false);
    });
  });

  describe('non-owner cannot', function () {
    it('freeze', async function () {
      await expectRevert(this.token.freeze({from: unlocked}), 'Ownable: caller is not the owner');
    });
    it('unfreeze', async function () {
      await expectRevert(this.token.unfreeze({from: unlocked}), 'Ownable: caller is not the owner');
    });
    it('lock address', async function () {
      await expectRevert(this.token.setLock(locked, true, {from: unlocked}), 'Ownable: caller is not the owner');
    });
    it('unlock address', async function () {
      await this.token.setLock(locked, true, {from: owner});
      await expectRevert(this.token.setLock(locked, false, {from: unlocked}), 'Ownable: caller is not the owner');
    });
  });

  const InitialSupply = new BN('200000000000000000000000000'); // 200000000 * (10 ** 18)
  const token1 = new BN(1);
  const token2 = new BN(2);

  describe('When freezed', function () {
    beforeEach(async function () {
      await this.token.freeze({from: owner});
      await this.token.setLock(locked, true, {from: owner});
    });
    it('owner can transfer', async function () {
      await this.token.transfer(unlocked, token1, {from: owner});
      expect(await this.token.balanceOf(unlocked)).to.be.bignumber.equal(token1);
      expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(InitialSupply.sub(token1));
    });
    it('unlocked address cannot transfer', async function () {
      await this.token.transfer(unlocked, token1, {from: owner});
      await expectRevert(this.token.transfer(unlocked, token1, {from: unlocked}), 'ValorIndexToken: Not Tradable');
    });
    it('locked address cannot transfer', async function () {
      await this.token.transfer(locked, token1, {from: owner});
      await expectRevert(this.token.transfer(locked, token1, {from: locked}), 'ValorIndexToken: Not Tradable');
    });

    it('any address can approve', async function () {
      await this.token.approve(unlocked, token1, {from: owner});
      await this.token.approve(locked, token1, {from: unlocked});
      await this.token.approve(owner, token1, {from: locked});
    });
    it('only Owner can burn', async function () {
      await this.token.burn(token1, {from: owner});
      expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(InitialSupply.sub(token1));
      expect(await this.token.totalSupply()).to.be.bignumber.equal(InitialSupply.sub(token1));

      // non-owner
      await this.token.transfer(unlocked, token1, {from: owner});
      await expectRevert(this.token.burn(token1, {from: unlocked}), 'ValorIndexToken: Not Tradable');
    });

    it('owner can transfer other token when approved using transferFrom', async function () {
      await this.token.transfer(locked, token2, {from: owner});
      await this.token.approve(owner, token1, {from: locked});
      await this.token.transferFrom(locked, normal, token1, {from: owner});
      expect(await this.token.balanceOf(normal)).to.be.bignumber.equal(token1);
    });

    it('locked address token cannot be transfered by non-owner when approved', async function () {
      await this.token.transfer(locked, token2, {from: owner});
      await this.token.approve(normal, token1, {from: locked});
      await expectRevert(this.token.transferFrom(locked, unlocked, token1, {from: normal}), 'ValorIndexToken: Not Tradable');
    });
  });

  describe('When Unfreezed', function () {
    beforeEach(async function () {
      await this.token.setLock(locked, true, {from: owner});
    });
    it('owner can transfer', async function () {
      await this.token.transfer(unlocked, token1, {from: owner});
      expect(await this.token.balanceOf(unlocked)).to.be.bignumber.equal(token1);
      expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(InitialSupply.sub(token1));
    });
    it('unlocked address can transfer', async function () {
      await this.token.transfer(unlocked, token2, {from: owner});
      await this.token.transfer(normal, token1, {from: unlocked});
      expect(await this.token.balanceOf(unlocked)).to.be.bignumber.equal(token1);
    });
    it('locked address cannot transfer', async function () {
      await this.token.transfer(locked, token2, {from: owner});
      await expectRevert(this.token.transfer(normal, token1, {from: locked}), 'ValorIndexToken: Not Tradable');
    });
    it('any address can approve', async function () {
      await this.token.approve(unlocked, token1, {from: owner});
      await this.token.approve(locked, token1, {from: unlocked});
      await this.token.approve(owner, token1, {from: locked});
    });
    it('owner can burn', async function () {
      await this.token.burn(token1, {from: owner});
    });
    it('unlocked address can burn', async function () {
      await this.token.transfer(unlocked, token2, {from: owner});
      await this.token.burn(token1, {from: unlocked});
      expect(await this.token.balanceOf(unlocked)).to.be.bignumber.equal(token1);
    });

    it('locked address token cannot be transfered when approved', async function () {
      await this.token.transfer(locked, token2, {from: owner});
      await this.token.approve(normal, token1, {from: locked});
      await expectRevert(this.token.transferFrom(locked, unlocked, token1, {from: normal}), 'ValorIndexToken: Not Tradable');
    });

  });
});