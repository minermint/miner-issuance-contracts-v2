const config = require("../config.js");

var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
    console.log("skipping Migrations deployment...")
    return;
    deployer.deploy(Migrations);
};
