const { BN, constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require("chai");
const Remit = artifacts.require("Remit");

contract("Token", (accounts) => {
  	let token; 
    beforeEach(async () =>{
      token = await Remit.new();
      owner= accounts[0];
  	  receiver= accounts[1];
  	  spender= accounts[2];
  	  amount= new BN('100');
    });

    describe("Token Details",() =>{
    	it("should verify token name", async () =>{
    	assert.equal(await token.name(),"Remit");
    	});

    	it("should verify token symbol", async () =>{
    	assert.equal(await token.symbol(),"REMIT");
    	});

    	it("should verify token decimals", async () =>{
    	assert.equal(await token.decimals(),18);
    	});

    	it("should verify total supply of token", async () =>{
    	expect(await token.totalSupply()).to.be.bignumber.equal("1000");
    	});
    });

    describe("should transferred the amount of token supply to token owner",() =>{
     	it("owner balance should be equal to totalSupply", async () =>{
     		const totalSupply=await token.totalSupply();
     		const ownerBalance=await token.balanceOf(owner);

     		expect(ownerBalance).to.be.bignumber.equal(totalSupply);
     	});
    });

    describe("Transfer",() =>{
      	it("tokens transferred should be equal to the balance of receiver", async () =>{
      		receipt= await token.transfer(receiver,amount,{from:owner});
      		const receiverBalance= await token.balanceOf(receiver);

      		expect(receiverBalance).to.be.bignumber.equal(amount);
      		expectEvent(receipt,'Transfer',{ _from:owner, _to: receiver, _value: amount}); //Transfer event is expected here
      	});

      	it("should reject if tokens transferred > balance", async () =>{
      		await expectRevert.unspecified(token.transfer(receiver,2000,{from:owner}));
      	});
    });

    describe("Should Approve",() =>{
      	it("owner approves the spender successfully ", async () =>{
      		receipt= await token.approve(spender,amount,{from:owner});
    		expect(await token.allowance(owner, spender)).to.be.bignumber.equal(amount);
      		expectEvent(receipt,'Approval',{_owner: owner, _spender: spender, _value: amount});
      	});	
    });

    describe("TransferFrom",() =>{
      	it("spender transfers the tokens successfully on behalf of owner", async () =>{
      		await token.transfer(spender,amount,{from:owner});// providing some amount to spender for his transaction only
      		await token.approve(spender,amount,{from:owner});

      		receipt=await token.transferFrom(owner,receiver,amount,{from: spender});
      		const receiverBalance= await token.balanceOf(receiver);
      		const spenderBalance= await token.balanceOf(spender);
			expect(receiverBalance).to.be.bignumber.equal(amount);
			expect(spenderBalance).to.be.bignumber.equal(amount);
      		expectEvent(receipt,'Transfer',{_from: owner, _to: receiver, _value: amount});
      	});

      	it("should reject if tokens transferred > allowance", async () =>{
      		await token.approve(spender,amount,{from:owner});
       		await expectRevert.unspecified(token.transferFrom(owner,receiver,amount+1,{from:spender}));
       	});

       	it("should reject if no approval is given to spender", async () =>{
       		await expectRevert.unspecified(token.transferFrom(owner,receiver,amount,{from:spender}));
       	});
    });
    describe("Mint Token",() =>{
    	it('should reject a null account', async  () =>{
      		await expectRevert(token.mint(ZERO_ADDRESS, amount),"Can't mint to zero address");	
      	});

      	it('should reject mint if (totalSupply + amount)> maxSupply', async  () =>{
      		const maxSupply= await token.maxSupply();
	        await expectRevert(token.mint(receiver, maxSupply),"The total supply cannot exceed 5.000.000");
	    });

    	beforeEach('minting', async  () =>{
    		totalSupply=await token.totalSupply();
        	receipt = await token.mint(receiver, amount);
        });

      	it('should increment totalSupply', async  () =>{
	        const new_totalSupply = totalSupply.add(amount);
	        expect(await token.totalSupply()).to.be.bignumber.equal(new_totalSupply);
	    });

      	it('should increment recipient balance', async  () =>{
        	expect(await token.balanceOf(receiver)).to.be.bignumber.equal(amount);
      	});

      	it('should emit Transfer event', async  () =>{
        	expectEvent(receipt, 'Transfer', { _from: ZERO_ADDRESS, _to: receiver, _value: amount});
        });
    });

    describe("Burn Token",() =>{
     	it('should reject a null account', async  () => {
      		await expectRevert(token.burn(ZERO_ADDRESS, amount,{from:owner}),"Can't burn from zero address");
    	});

    	it('should reject if burn amount > balance', async  () => {
    		await token.transfer(spender,amount,{from:owner});
    		const spenderBalance= await token.balanceOf(spender);
        	await expectRevert(token.burn(spender, spenderBalance+1), "Burn amount can't exceed balance");
      	});

    	beforeEach('burning', async  () => {
    		await token.transfer(spender,amount,{from:owner});
    		spenderBalance= await token.balanceOf(spender);
    		totalSupply= await token.totalSupply();
	        receipt = await token.burn(spender, amount);
	    });

		it('should decrement totalSupply', async  () => {
		const new_totalSupply = totalSupply.sub(amount);
		expect(await token.totalSupply()).to.be.bignumber.equal(new_totalSupply);
		});

		it('should decrement spender balance', async  () => {
		const new_Balance = spenderBalance.sub(amount);
		expect(await token.balanceOf(spender)).to.be.bignumber.equal(new_Balance);
		});

		it('should emit Transfer event', async  () => {
		expectEvent(receipt, 'Transfer', { _from: spender, _to: ZERO_ADDRESS, _value:amount});
		});  
	});
}); 
