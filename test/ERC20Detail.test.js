const { accounts, contract } = require('@openzeppelin/test-environment');

const { constants, expectEvent } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const SimpleToken = contract.fromArtifact('ValorIndexToken');

describe('ERC20Detail-ValorIndexToken', function () {
  const [ creator ] = accounts;

  beforeEach(async function () {
    this.token = await SimpleToken.new({ from: creator });
  });

  it('has a name', async function () {
    expect(await this.token.name()).to.equal('Valor Index Token');
  });

  it('has a symbol', async function () {
    expect(await this.token.symbol()).to.equal('VALO');
  });

  it('has 18 decimals', async function () {
    expect(await this.token.decimals()).to.be.bignumber.equal('18');
  });

  it('assigns the initial total supply to the creator', async function () {
    const totalSupply = await this.token.totalSupply();
    const creatorBalance = await this.token.balanceOf(creator);

    expect(creatorBalance).to.be.bignumber.equal(totalSupply);

    await expectEvent.inConstruction(this.token, 'Transfer', {
      from: ZERO_ADDRESS,
      to: creator,
      value: totalSupply,
    });
  });
});