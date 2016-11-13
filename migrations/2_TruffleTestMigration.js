module.exports = function(deployer) {
    deployer.deploy(TimeClock, "This is the unit test contract",1, 1, 10, web3.toWei(0.01, 'ether'));
};
