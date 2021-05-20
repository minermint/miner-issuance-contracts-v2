require("dotenv").config();

var config = {}

config.mnemonic_or_private_key = process.env.MNEMONIC ? process.env.MNEMONIC : process.env.PRIVATE_KEY;
config.infura_id = process.env.INFURA_ID;

config.kovan = {
    contracts: {
        uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    }
};

module.exports = config;
