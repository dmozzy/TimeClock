contract('TimeClock', function(accounts) {
    it("should be 10 paymentCount", function() {
        var meta = TimeClock.deployed();

        return meta.paymentsCount.call().then(function(paymentCount) {
            assert.equal(paymentCount, 10, "10 paymentCount check");
        });
    });

    it("startTime should be set", function() {
        var meta = TimeClock.deployed();

        return meta.startTime.call().then(function(startTime) {
            console.log("startTime is:" + startTime);
            assert.isAbove(startTime, 0, "Starttime should be set");
        });

    });

    it("transferMoney test", function() {
        var meta = TimeClock.deployed();
        return meta.purchase("Hello", {
            from: accounts[0],
            value: web3.toWei(1, 'ether')
        }).then(function() {
            return meta.amountInEscrow.call().then(function(amountInEscrow) {
                console.log("amountInEscrow is " + amountInEscrow);
                assert.isAbove(amountInEscrow, 0, "amountInEscrow should be set");
                return meta.getContractee.call(0, {
                    from: accounts[0]
                }).then(function(returned) {
                    assert.isAbove(returned[1], 0, "Contractee funds should be above zero now");
                });
            });
        });
    });


    it("update test", function() {
        console.log("Update test");
        var meta = TimeClock.deployed();
        return meta.update({
            from: accounts[0]
        }).then(function() {
            return meta.contractorBalance.call().then(function(contractorWithdrawable) {
                console.log("contractorWithdrawable is " + contractorWithdrawable);
                assert.isAbove(contractorWithdrawable, 0, "contractorWithdrawable should be set");
            });
        });
    });

    it("Withdraw Contractee", function() {
        var meta = TimeClock.deployed();
        return meta.contracteeWithdraw(0,{
            from: accounts[0]
        }).then(function() {
            return meta.getContractee.call(0, {
                from: accounts[0]
            }).then(function(returned) {
                console.log("returned = " + returned);
                assert.equal(returned[1], 0, "Contractee funds should be zero now");
            });
        });
    });

    it("Withdraw Contractor", function() {
        var meta = TimeClock.deployed();
        return meta.contractorWithdraw({
            from: accounts[0]
        }).then(function() {
            return meta.contractorBalance.call().then(function(contractorWithdrawable) {
                console.log("contractorWithdrawable is " + contractorWithdrawable);
                assert.equal(0, 0, "amountInEscrow should be set");
            });
        });
    });


    var exceptionCaught = false;
    it("transferMoney test fail to small", function() {
        var meta = TimeClock.deployed();
        return meta.purchase("Hello", {
            from: accounts[0],
            value: web3.toWei(0.001, 'ether')
        }).catch(function(){
          console.log("Success")
          exceptionCaught = true;
        }).then(function(){
          assert.isTrue(exceptionCaught,"an exception should have been thrown and caught as the fee is too low");

        });
    });
})
