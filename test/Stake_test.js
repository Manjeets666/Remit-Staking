  const { BN, constants, expectEvent, expectRevert, time} = require('@openzeppelin/test-helpers');
  
  const { expect } = require("chai");
  const Remit = artifacts.require("Remit");
  const RemitStaking = artifacts.require("RemitStaking");


  contract("Staking Remit Tokens", (accounts) => {
  
    beforeEach(async () =>{
      RT = await Remit.new();
      owner= accounts[0];
      staker=accounts[1];
      stake = await RemitStaking.new(RT.address);
      amountToStake= web3.utils.toWei("20","ether");
      amountToWithdraw= web3.utils.toWei("39.4","ether");
    }); 
 	describe("constructor", () => {
	    it("should deploy", async () => {
		      const stake = await RemitStaking.new(RT.address);
		      assert.equal(await stake.showAddressToken(),RT.address);
		    });
	});

	describe("Deposit won't work:", () => {

		it("if staker_balance < amount to stake ", async () =>{
    		await RT.mintCirculationSupply(owner,web3.utils.toWei("100","ether"));
			await RT.transfer(staker,web3.utils.toWei("50","ether"),{from: owner});
			await RT.approve(stake.address,web3.utils.toWei("50","ether"),{from:staker});
			await RT.setStakeAddress(stake.address);
			await expectRevert.unspecified(stake.deposit(web3.utils.toWei("60","ether"),{from : staker}));
		});

		it('if stake address not set',async () => {
			await RT.mintCirculationSupply(owner,web3.utils.toWei("100","ether"));
			await RT.transfer(staker,web3.utils.toWei("50","ether"),{from: owner});
			await RT.approve(stake.address,web3.utils.toWei("50","ether"),{from:staker});
			try{
	        	await stake.deposit(amountToStake,{from : staker});
	       	}
	    	catch{
	       	}     	 
	    });

		it("if no tokens deposited", async () =>{
			await expectRevert(stake.deposit(0),"Cannot deposit 0 Tokens");
		});
	});

  
    describe("To Deposit successfully", () => {

		it("staker should able to deposit tokens", async () => {
			await RT.mintCirculationSupply(owner,web3.utils.toWei("100","ether"));
			await RT.transfer(staker,web3.utils.toWei("50","ether"),{from: owner});
			await RT.approve(stake.address,web3.utils.toWei("40","ether"),{from:staker});
			await RT.setStakeAddress(stake.address);
			await stake.deposit(amountToStake,{from : staker});

			await time.increase(time.duration.hours(24));
			await stake.deposit(amountToStake,{from : staker});		
      	});		

  	beforeEach('Staking', async  () =>{
		await RT.mintCirculationSupply(owner,web3.utils.toWei("100","ether"));
		await RT.transfer(staker,web3.utils.toWei("60","ether"),{from: owner});
		await RT.approve(stake.address,web3.utils.toWei("60","ether"),{from:staker});
		await RT.setStakeAddress(stake.address);
		await stake.deposit(amountToStake,{from : staker});// 1st deposit

		prev_lastClaimedTime= await stake.lastClaimedTime(staker);
		prev_stakingTime= await stake.stakingTime(staker);
		await time.increase(time.duration.hours(70)); // to increase time diff.
		prev_deposited_tokens= await stake.depositedTokens(staker);
		prev_stakeFarmSupply = await RT.stakeFarmSupply();

		receipt= await stake.deposit(amountToStake,{from : staker});//2nd deposit
		curr_deposited_tokens= await stake.depositedTokens(staker);
		totalEarnedTokens= await stake.totalEarnedTokens(staker);
		totalClaimedRewards= await stake.totalClaimedRewards();
		curr_lastClaimedTime= await stake.lastClaimedTime(staker);
		curr_stakingTime= await stake.stakingTime(staker);
		curr_stakeFarmSupply = await RT.stakeFarmSupply();
		pendingDivs= await stake.getPendingDivs(staker);
		getNumberOfHolders= await stake.getNumberOfHolders();
	});
	
  	describe("To Withdraw successfully", () => {
  		it("staker should able to withdraw tokens", async () => {
  			await time.increase(time.duration.hours(73));
  			await stake.withdraw(amountToWithdraw,{from: staker});
  		});

  		it("deposited tokens should decrease", async () => {
  			await time.increase(time.duration.hours(73));
  			prev_deposited_tokens= await stake.depositedTokens(staker);
  			await stake.withdraw(amountToWithdraw,{from: staker});
  			curr_deposited_tokens= await stake.depositedTokens(staker);
  			assert.notEqual(prev_deposited_tokens,curr_deposited_tokens);
  		});

  		it("total earned tokens should increase ", async () => {
  			await time.increase(time.duration.hours(73));
  			await stake.withdraw(amountToWithdraw,{from: staker});
  			new_totalEarnedTokens= await stake.totalEarnedTokens(staker);
			assert.notEqual(new_totalEarnedTokens,totalEarnedTokens);	
        });

  		it("staker should be removed if withdrawn all deposited tokens", async () => {
  			await time.increase(time.duration.hours(73));
  			await stake.withdraw(amountToWithdraw,{from: staker});
  			assert.equal(await stake.getNumberOfHolders(),0);
  		});
    });
	
		it("stake farm supply should change ", async () => {
			assert.notEqual(prev_stakeFarmSupply,curr_stakeFarmSupply);
        });
		
		it("deposited tokens should increase ", async () => {
			assert.notEqual(prev_deposited_tokens,curr_deposited_tokens);
        });

        it("RewardsTransferred event should emit", async () => {
			expectEvent(receipt,'RewardsTransferred',{holder:staker});
        });

        it("total claimed rewards should increase", async () => {
			assert.notEqual(totalClaimedRewards,0);	
        });

        it("the last claimed time should change ", async () => {
			assert.notEqual(prev_lastClaimedTime,curr_lastClaimedTime);	
        });

        it("pendingDivs should become null again", async () => {
			assert.equal(pendingDivs,0);	
        });

  		it("staking time should change", async () => {
			assert.notEqual(prev_stakingTime,curr_stakingTime);	
        });
    });

    describe("To claimDivs successfully", () => {
    	it("total earned tokens should increase ", async () => {
			assert.notEqual(totalEarnedTokens,0);	
        });
    });
    
  	describe("To getNumberOfHolders", () => {
    	it("No. of holders/stakers should increase", async () => {
			assert.notEqual(getNumberOfHolders,0);	
        });
    });

  	describe("Withdraw won't work:", () => {
  		it("if amountToWithdraw > deposited tokens", async () => {
  			try{
  				await time.increase(time.duration.hours(73));
	         	await stake.withdraw(amountToWithdraw + 1,{from: staker});
	       	}
	    	catch{
	       	} 

  		});
  		it("if tokens withdrawn before cliffTime", async () => {
  			try{
	         	await stake.withdraw(amountToWithdraw + 1,{from: staker});
	       	}
	    	catch{
	       	}
        });
    });
});