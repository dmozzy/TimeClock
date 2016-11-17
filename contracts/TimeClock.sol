
/*
MIT License

Copyright (c) 2016 Daniel Moscufo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

pragma solidity ^0.4.2;

contract TimeClock {

  /*****************************************************************************
  * Structs
  *****************************************************************************/
  //This struct is used to hold the details of a Contractee
  struct Contractee {
    //Contractee address
    address addr;
    //Contractee Balance
    uint balance;
    //Contractee self provided description
    string description;
  }

  //Reentrant mutex check state variable
  bool mutex;

  /*****************************************************************************
  * Public Variables
  *****************************************************************************/
  //Contract start time
  uint public startTime;

  //Total number of payments
  uint public paymentsCount;

  //Current payment interval, initially 0.
  uint public currentPaymentsCount;

  //How far apart each payment is, e.g. 1 week
  uint public paymentInterval;

  //Amount in the escrow balance that will move to the contractorBalance on next update
  uint public amountInEscrow;

  //The amount in the contractor balance
  uint public contractorBalance;

  //A string description of the contract
  string public contractDetails;

  //The minimum payment, less than this will trigger an error
  uint public minimumPayment;

  //The contractors ethereum address
  address public contractorAddress;

  //The list of all contractees.
  //There is a maximum of 100 contractees for now. This is to avoid
  //making the cost of looping in the update not too expensive
  Contractee[100] public contractees;

  /*****************************************************************************
  * Events
  *****************************************************************************/
  event Purchase(address from, uint value, string description);
  event ContracteeWithdraw(address contractor, uint value, string description);
  event ContractorWithdraw(address contractee, uint value);
  event UpdateTriggered(address updator, uint escrowValue, uint paymentsCount);

  /*****************************************************************************
  * Constructor
  * contractDetailsText - The human readable description text
  * startDelayInSeconds - Time the contract will start in
  * paymentIntervalInSeconds - The timeframe in between each update/payment
  * numberOfPayments - Total number of payments/updates/intervals
  * minimumPaymentAmount - spam prevention mechanism to stop small payments with messages to the contract
  *****************************************************************************/
  function TimeClock (string contractDetailsText, uint startDelayInSeconds, uint paymentIntervalInSeconds, uint numberOfPayments, uint minimumPaymentAmount) {
    contractDetails = contractDetailsText;
    startTime =  block.timestamp + startDelayInSeconds;
    paymentInterval =  paymentIntervalInSeconds;
    paymentsCount = numberOfPayments;
    contractorAddress = msg.sender;
    currentPaymentsCount = 0;
    amountInEscrow = 0;
    contractorBalance = 0;
    minimumPayment = minimumPaymentAmount;
  }

  /*****************************************************************************
  * Modifiers see https://forum.ethereum.org/discussion/10889/my-first-contract-timeclock-service-delivery-labor-hire-contract#latest
  *****************************************************************************/
  modifier protected() {
    if (mutex) throw;  // Checks if contract has already been entered.
    mutex = true;
    _;
    delete mutex;  // sets to false and refunds some gas
    return;
  }

  /*****************************************************************************
  * Public Read Functions
  *****************************************************************************/
  //Returns the next date at which update can be called. This may be in the past
  //meaning that update can be called now.
  function getNextPaymentDate() returns (uint){
    return startTime + ((currentPaymentsCount +1) * paymentInterval);
  }

  //Returns the highest populated number in the contractees Array
  //Note: This can still have some values in it that are empty and should be filtered
  //on the ui.
  function contracteesSize() constant returns (uint contracteesLocation) {
    uint maxContracteesCount = 0;

    for (uint i = 0; i < contractees.length; i++) {
        if(contractees[i].addr != address(0) ) {
          maxContracteesCount = i+1;
        }
    }

    return maxContracteesCount;
  }

  /*****************************************************************************
  * Public Transactional Functions
  *****************************************************************************/

  //Default function just calls purchase with No Description provided.
  //Note: please do not use this, its just here to stop people from incorrectly
  //sending ether and then losing the ability to withdraw them
  function() {
    purchase("No Description provided");
  }

  //Adds a Contractee to the contract. Important values are:
  //description - The Contractees description (e.g. From Bob). Limited to 64 characters
  //msg.value - The amount paid into the contract
  //msg.address - The address of the Contractee and where any withdrawn funds will be deposited
  function purchase(string description) protected payable {
    if(bytes(description).length>128) {
      throw;
    }

    if(msg.value < minimumPayment) {
      throw;
    }

    if(currentPaymentsCount >= paymentsCount){
      throw;
    }

    bool notFound = true;
    uint insertPosition = 0;
    //loop through the contractees to see if there is one we can take
    for (uint i = 0; i < contractees.length && notFound; i++) {
      Contractee thisContractee = contractees[i];
      if(thisContractee.balance == 0) {
        insertPosition = i;
        notFound = false;
      }
    }

    if(notFound) {
      throw;
    }

    uint paymentsRemaining = paymentsCount - currentPaymentsCount;

    if (paymentsRemaining<=0) {
      throw;
    }

    uint toEscrow = msg.value / paymentsRemaining;
    amountInEscrow += toEscrow;

    contractees[insertPosition] = Contractee(msg.sender, msg.value - toEscrow, description);
    Purchase(msg.sender, msg.value, description);
  }

  //This triggers the update of the contract and will only work if the current block.timestamp
  //is less than the next payment date
  function update() protected {
    uint _currentBlock = calculatedPaymentInterval();

    //The 15 seconds here are to allow the unit testing of this function without a delay
    if(getNextPaymentDate() > (block.timestamp+15)) {
      throw;
    }

    //Self destruct on completion of the contract
    if(currentPaymentsCount >= paymentsCount){
      if(msg.sender == contractorAddress) {
        selfdestruct(contractorAddress);
      } else {
        throw;
      }
    }

    if(_currentBlock > currentPaymentsCount ) {
      currentPaymentsCount ++;
      uint paymentsRemaining = paymentsCount - currentPaymentsCount;
      contractorBalance += amountInEscrow;
      amountInEscrow = 0;

      if(paymentsRemaining > 0) {
        for (uint i = 0; i < contractees.length; i++) {
          Contractee thisContractee = contractees[i];
          uint currentBalance = thisContractee.balance;
          if(currentBalance > 0) {
            uint toEscrow = currentBalance / paymentsRemaining;
            amountInEscrow += toEscrow;
            thisContractee.balance = currentBalance - toEscrow;
          }
        }
      }
    }
    UpdateTriggered(msg.sender, amountInEscrow, currentPaymentsCount);
  }

  //Enables a Contractee to withdraw any and all funds that are in their balance
  function contracteeWithdraw(uint index) protected {
    Contractee thisContractee = contractees[index];
    if(thisContractee.addr != msg.sender && contractorAddress != msg.sender) {
      throw;
    }

    if(thisContractee.balance > 0) {
      uint balanceToSend = thisContractee.balance;
      thisContractee.balance = 0;
      if(!thisContractee.addr.send(balanceToSend)) {
        throw;
      }
      ContracteeWithdraw(msg.sender,balanceToSend,thisContractee.description);
    }
  }

  //Enables a Contractor to withdraw any funds that have been moved over into
  //their balance
  function contractorWithdraw() protected {
    uint amountToWithdraw = contractorBalance;
    contractorBalance = 0;
    if(!contractorAddress.send(amountToWithdraw)) {
      throw;
    }
    ContractorWithdraw(msg.sender, amountToWithdraw);
  }

  /*****************************************************************************
  * Private Functions
  *****************************************************************************/
  //Returns the calculated payment interval. Uses the start time and the current block.timestamp
  function calculatedPaymentInterval() private returns (uint calculatedInterval) {
    return (block.timestamp - startTime) / paymentInterval;
  }
}
