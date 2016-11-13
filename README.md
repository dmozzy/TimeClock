TimeClock - Ethereum based service delivery contract with escrow
================================================================

Overview
--------
TimeClock is a prototype/proof of concept smart contract and javascript/html interface that enables one to setup a Contractor and Contractee relationship for the delivery of services.

TimeClock is written in Solidity and makes heavy use of Truffle. It can be deployed on any Ethereum block chain.

Status
----------------------
TimeClock is currently only in the idea / proof of concept phase. It hasn't had any reviews our audits done against it. TimeClock should not be used for any serious contract work until a time that it is fully proven. TimeClock is licenced under the MIT licence (see licence.txt).

How it works
------------
TimeClock uses escrow and time based intervals to manage the payments to limit the risk to all parties when entering into a services contract. One payment is kept in escrow and will be paid to the Contractor at the completion of the current time interval. The Contractee can withdraw all their funds (that aren't in escrow at any time).

Example
-------
Bob (the contractee) wants to hire Mary (the contractor) to build a website for him. Mary wants to ensure she is paid for her work, and Bob wants to ensure Mary does the work to his satisfaction before parting with the money. Mary and Bob agree that the website will be built over 10 weeks with payments of 100 ether per week.

Mary sets up a TimeClock contract with the following properties:

 1. Contract Details = Bob's Gardening Website build
 2. Start Interval Seconds = 86400 - The contract will start in 24 hours (entered in seconds)
 3. Payment Interval Seconds = 604800 - The Payment Interval is 1 week (entered in seconds)
 4. Payments Count = 10
 5. Minimum Payment = 1000000000000000000 (This is 1 ether in wei. Note: this doesn't stop Bob paying more, it just stops someone spamming small payments to the contract)

Bob deposits the full payment of 1000 ether into the contract (10 payments of 100 ether). When Bob deposits the ether, 100 ether immediately goes into escrow. The other 900 ether stays in Bob's balance in the contract. At anytime before the next payment, Bob can withdraw his remaining 900 ether and thus terminate the contract.

In a weeks time - Mary will trigger the 'Update' function of the contract. This will do 2 things:

 1. Transfer any funds in escrow to her balance in the contract. This would be the 100 ether originally put in escrow by Bob's deposit.
 2. Assuming Bob is happy with the progress and hasn't withdrawn his funds, another 100 ether will be moved from Bob's balance into escrow.

Mary can withdraw any funds from her balance at any time. Bob can also withdraw his remaining funds and terminate the contract at anytime.

This continues for the remaining 9 intervals until all the money has been transferred from Bob to Mary and the website is complete.

Example Contract
----------------------
There is a Test Contract deployed at 0x566d8A075D55122CC19Ad09006114B7B656E6596 on the main ethernet chain. This is a payment to itself that pays out every 7 days for a total of 10 payments.

Future Ideas
------------

 - Sub TimeClock contracts. Enable one larger contract to pay into a smaller contract so as to enable large work to be split up and sub contractors employed.
 - Multiple Contractees (already allowed up to 100)
 - Use for crowd funding / foundations. E.g. a foundation is formed that sets up a TimeClock contract with 100 payments at a weekly interval. Donees can donate into the contract. As long as the donee is happy with the foundation, the donation will slowly move over to the foundations control every week. If at anytime the foundation breaks the trust of the donees, the donees can withdraw their remaining balance.


How to install and use (using geth and Ethereum Wallet)
----------------------
 1. Clone the repository from Github
 1. Deploy the contract to an ethereum blockchain.  This can be done using Ethereum Mist Wallet by going to Contracts -> Deploy New Contract  and then pasting the contents of contracts/TimeClock.sol into the sources folder.
 1. Select "Time Clock" in the "Select Contract to Deploy" selection
 1. Enter values for the Constructor Parameters. Note "Minimum Payment" amount is in wei. I use http://ether.fund/tool/converter to get the wei amount to enter.
 1. Deploy the contract and make note of the contract address
 1. Go into the root of where you downloaded the Time Clock repo.
 1. Make sure truffle is installed (npm install -g truffle)
 1. Run "truffle build"
 1. Run "truffle server -p 8082"
 1. In your browser navigate to "http://localhost:8082"
 1. Enter the contract address in the "Timeclock contract" text field and click "Display Contract"
 1. Note: To trigger any actions on the contract you will need to unlock the account in your geth console

Building
----------------------
see Truffle for detailed instructions: https://github.com/ConsenSys/truffle

Notes
----------------------

 1. Anybody can trigger the 'Update' and 'Contractor Withdraw' functions. This is by design to potentially support sub contracts in the future. If only the Contractor could do these, they could prevent funds from flowing onto any subcontracts.
 2. On completion of the contract (all payment intervals have been processed), an update will call selfdestruct and any remaining funds in the contract will flow to the Contractor.
 3. A Contractee (new or existing) can pay ether into the contract at anytime. Ether will be transferred into escrow based on the number of intervals remaining. E.g. If there are 5 intervals remaining and Bob transfers another 5 ether into the contract, 1 ether will go into escrow and 4 ether will go into Bob's balance.
 4. Currently there is no sanity check on the time that is returned from block.timestamp. If this is a security gap, a check on the block number will be needed.
 5. There is a limit of 100 Contractees allowed for a contract and 1 Contractor. The 100 limit is to prevent the loop in the update function taking too long. I'm not sure if this is necessary or not?

UI Screenshot
-------
![enter image description here](https://raw.githubusercontent.com/dmozzy/TimeClock/master/images/TimeClockScreenshot.png)

Licence
-------
MIT License

> Written with [StackEdit](https://stackedit.io/).
