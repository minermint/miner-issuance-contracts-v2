require("dotenv").config();

var config = {}

config.mnemonic_or_private_key = process.env.MNEMONIC ? process.env.MNEMONIC : process.env.PRIVATE_KEY;
config.infura_id = process.env.INFURA_ID;

config.kovan = {
    contracts: {
        uniswap_v2_router_02: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D,
        chainlink_ethusd_aggregator: 0x9326BFA02ADD2366b30bacB125260Af641031331,
        miner: 0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De
    }
};

module.exports = config;
