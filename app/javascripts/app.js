function getIntervalString(value) {
    var seconds = value % 60;
    value = (value - seconds) / 60;
    var minutes = value % 60;
    value = (value - minutes) / 60;
    var hours = value % 24;
    value = (value - hours) / 24;
    var days = value
    return days + " days, " + hours + " hours, " + minutes + " minutes, " + seconds + " seconds";
}

function hasAccessToAddress(addressIn) {
    return window.accounts.filter(function(userAccount) {
        return userAccount == addressIn
    }).length > 0
}

function displayContract() {
    var contractAddress = document.forms['contractSelection'].timeClockContract.value;
    window.contract = TimeClock.at(contractAddress);
    window.pendingTransactions = [];
    refreshDisplay();
}

function setStatus(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
};

function rerenderPage(data) {
  if(typeof data.contractorAddress == 'undefined' || data.contractorAddress == '0x') {
    document.getElementById('templateInsert').innerHTML = "<b>Contract not found</b>";
  } else {
    data.allowUpdate = data.nextPaymentTime < new Date();

    var output = Mustache.render(window.template, data);
    document.getElementById('templateInsert').innerHTML = output;
  }
}

function getField(field, fieldName, data, displayFunction) {
    if (typeof displayFunction == 'undefined') {
        displayFunction = function(value) {
            return value;
        };
    }
    field.call({
        from: window.account
    }).then(function(value) {
        data[fieldName] = displayFunction(value);
        rerenderPage(data);
    }).catch(function(e) {
        alert("An error has occured, see log");
        console.log(e);
        setStatus("Error getting " + fieldName + "; see log.");
    });
}


function refreshDisplay() {
    if (typeof window.contract == 'undefined') {
        document.getElementById('templateInsert').innerHTML = "";
        return;
    }

    var templateData = {
        contractees: [],
        accounts: window.accounts,
        pendingTransactions: window.pendingTransactions,
        hasPendingTransactions: window.pendingTransactions.length > 0,
        allowUpdate : true
    };

    var timeClock = window.contract;
    getField(timeClock.contractDetails, 'contractDetails', templateData);

    getField(timeClock.startTime, 'startTime', templateData, function(value) {
        return new Date(new Number(value.toString()) * 1000);
    });
    getField(timeClock.getNextPaymentDate, 'nextPaymentTime', templateData, function(value) {
        return new Date(new Number(value.toString()) * 1000);
    });
    getField(timeClock.paymentInterval, 'paymentInterval', templateData, getIntervalString);
    getField(timeClock.paymentsCount, 'paymentsCount', templateData);
    getField(timeClock.minimumPayment, 'minimumPayment', templateData, function(value) {
        return web3.fromWei(value, 'ether');
    });


    getField(timeClock.currentPaymentsCount, 'currentPaymentsCount', templateData);
    getField(timeClock.contractorAddress, 'contractorAddress', templateData);
    templateData.isContractor = hasAccessToAddress(templateData.contractorAddress);

    getField(timeClock.contracteesSize, 'contracteesSize', templateData);
    getField(timeClock.amountInEscrow, 'amountInEscrow', templateData, function(value) {
        return web3.fromWei(value, 'ether');
    });
    getField(timeClock.contractorBalance, 'contractorBalance', templateData, function(value) {
        return web3.fromWei(value, 'ether');
    });

    timeClock.contracteesSize.call({
        from: window.account
    }).then(function(size) {
        console.log("size = " + size);
        for (var i = 0; i < size; i++) {
            (function(index) {
              timeClock.contractees.call(index, {
                  from: window.account
              }).then(function(returned) {
                  if (returned[1] > 0) {
                      templateData.contractees.push({
                          index: index,
                          address: returned[0],
                          balance: web3.fromWei(returned[1], 'ether'),
                          description: returned[2],
                          isContractee: hasAccessToAddress(returned[0])
                      });
                  }

                  rerenderPage(templateData);
              }).catch(function(e) {
                  console.log(e);
                  setStatus("Error getting balance; see log.");
              });;
          })(i);
        }
    }).catch(function(e) {
        alert("An error has occured, see log");

        console.log(e);
        setStatus("Error getting balance; see log.");
    });

};

function pay() {
    var timeClock = window.contract;
    var accountToPayFrom = document.forms['timeClockForm'].accountToPayFrom.value;
    var paymentAmountFromForm = document.forms['timeClockForm'].paymentAmount.value;
    var paymentAmount = web3.toWei(paymentAmountFromForm, 'ether');
    var paymentDescription = document.forms['timeClockForm'].paymentDescription.value;
    var gasAmount = document.forms['timeClockForm'].gasAmount.value;

    if (confirm("Are you sure you want to send " + paymentAmountFromForm + " ether to this TimeClock contract?\n\n" +
            "(Note: some funds will be immediately transferred into escrow and will not be withdrawable by you)")) {

        var pendingTransaction = {
            type: "Payment",
            amount: paymentAmountFromForm + " ether",
            description: paymentDescription,
            status: "Pending",
            class: "transactionPending"
        };
        var purchaseTransaction = timeClock.purchase(paymentDescription, {
            from: accountToPayFrom,
            value: paymentAmount,
            gas: gasAmount
        }).then(function(txId) {
            getTransactionStatus(txId, pendingTransaction);
            refreshDisplay();
        }).catch(function(e) {
            pendingTransaction.status = "Failed:" + e.message;
            pendingTransaction.class = "transactionFailed";
            alert("An error has occured: " + e.message);
            console.log(e);
            d
            refreshDisplay();
        });

        window.pendingTransactions.push(pendingTransaction);
        refreshDisplay();

        console.log("Purchase Transaction = " + purchaseTransaction);
    }
}

function getTransactionStatus(txId, pendingTransaction) {
    var transactionData = web3.eth.getTransaction(txId);
    var transactionReceipt = web3.eth.getTransactionReceipt(txId);
    console.log("txid:" + txId + ", gas used:" + transactionReceipt.gasUsed);
    if (transactionData.gas == transactionReceipt.gasUsed) {
        pendingTransaction.status = "Transaction failed";
        pendingTransaction.class = "transactionFailed";
    } else {
        pendingTransaction.status = "Processed";
        pendingTransaction.class = "transactionProcessed";
    }

}

function contractorWithdraw() {
    if (confirm("This will transfer all withdrawable funds to the contractor and will cost you gas. \n\nDo you wish to proceed?")) {

        var timeClock = window.contract;
        var accountToPayFrom = document.forms['contractorWithdrawForm'].accountToPayFrom.value;
        var gasAmount = document.forms['contractorWithdrawForm'].gasAmount.value;

        var pendingTransaction = {
            type: "Contractor Withdraw",
            amount: "",
            description: "Withdraw to contractor address",
            status: "Pending",
            class: "transactionPending"
        };

        timeClock.contractorWithdraw({
            from: accountToPayFrom,
            gas: gasAmount
        }).then(function(txId) {
            getTransactionStatus(txId, pendingTransaction);
            refreshDisplay();
        }).catch(function(e) {
            pendingTransaction.status = "Failed:" + e.message;
            pendingTransaction.class = "transactionFailed";
            alert("An error has occured: " + e.message);
            console.log(e);
            refreshDisplay();
        });
        window.pendingTransactions.push(pendingTransaction);
        refreshDisplay();
    }
}

function contracteeWithdraw() {
    if (confirm("Are you sure you want to withdraw your remaining payments from this TimeClock contract?\n\n(Note: this will withdraw all payments made from " + withdrawAddress + ")")) {

        var timeClock = window.contract;
        var withdrawAddress = document.forms['contracteeWithdrawForm'].withdrawAddress.value;
        var gasAmount = document.forms['contracteeWithdrawForm'].gasAmount.value;
        var withdrawIndex = document.forms['contracteeWithdrawForm'].withdrawIndex.value;

        var pendingTransaction = {
            type: "Contractee Withdraw",
            amount: "",
            description: "Withdraw all Contractee balance from " + withdrawAddress,
            status: "Pending",
            class: "transactionPending"
        };

        timeClock.contracteeWithdraw(withdrawIndex, {
            from: withdrawAddress,
            gas: gasAmount
        }).then(function(txId) {
            getTransactionStatus(txId, pendingTransaction);
            refreshDisplay();
        }).catch(function(e) {
            pendingTransaction.status = "Failed:" + e.message;
            pendingTransaction.class = "transactionFailed";
            alert("An error has occured: " + e.message);
            console.log(e);
            refreshDisplay();
        });
    }
    window.pendingTransactions.push(pendingTransaction);
    refreshDisplay();

}

function updateContract() {
    if (confirm("This will attempt to move the contract to the next payment interval. This will update the 'Current payment #' and change balances.\n\n" +
            "This can only be done after the 'Next update time' has passed. This operation will cost gas.\n\n" +
            "Do you wish to proceed?"
        )) {
        var timeClock = window.contract;
        var updateAddress = document.forms['updateContractForm'].accountToPayFrom.value;
        var gasAmount = document.forms['updateContractForm'].gasAmount.value;

        var pendingTransaction = {
            type: "Update",
            amount: "",
            description: "Update the contract state.",
            status: "Pending",
            class: "transactionPending"
        };

        timeClock.update({
            from: updateAddress,
            gas: gasAmount
        }).then(function(txId) {
            getTransactionStatus(txId, pendingTransaction);
            refreshDisplay();
        }).catch(function(e) {
            pendingTransaction.status = "Failed:" + e.message;
            pendingTransaction.class = "transactionFailed";
            alert("The contract could not be updated. This is normally caused by trying to update the contract before the 'Next update time'. Error was " + e.message);
            refreshDisplay();
            console.log(e);
        });
    }
    window.pendingTransactions.push(pendingTransaction);
    refreshDisplay();
}

function overlay(dialogName) {
    el = document.getElementById(dialogName);
    el.style.visibility = (el.style.visibility == "visible") ? "hidden" : "visible";
}

window.onload = function() {
    web3.eth.getAccounts(function(err, accs) {
        if (err != null) {
            alert("There was an error fetching your accounts.");
            return;
        }

        if (accs.length == 0) {
            alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
            return;
        }

        window.accounts = accs;
        window.account = accounts[0];
        window.pendingTransactions = [];
        window.template = document.getElementById('template').innerHTML;
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('contract')) {
            document.forms['contractSelection'].timeClockContract.value = urlParams.get('contract');
        } else if (typeof TimeClock.deployed() != 'undefined') {
            document.forms['contractSelection'].timeClockContract.value = TimeClock.deployed().address;
        }
        refreshDisplay();
    });
}
