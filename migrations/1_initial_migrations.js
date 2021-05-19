const config = require("../config.js");

var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
    return;
    deployer.deploy(Migrations);
};
