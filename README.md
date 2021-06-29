# Miner Token Contracts

# Building Contracts

## Deploying a contract

Contracts can be deployed to the various networks configured in truffle.js.

You will need a mnenomic or private key to deploy contracts to various networks.

To deploy a contract to a network, run one of the deployment targets. There are
convenience npm targets you can run to deploy to development or staging.

NOTE: MinerToken uses Truffle to deploy contracts but the Truffle Migrations
process has been disabled and addresses and ABI information is stored under
build/contracts. Truffle configuration is stored under build/truffle.

### Miner Token and Treasury Contracts

The Miner (MINER) and Treasury contracts have already been deployed and there
are currently no plans to upgrade them. The Miner and Treasury contracts
have been updated to compile with the newer versions of Solidity for testing
purposes but should not be deployed to any testnets or mainnet. Instead, use
[v1.1.0](https://github.com/minermint/miner-contracts/releases/tag/1.1.0) 
contracts if deploying to a new testnet.

Current Deployments:

**Mainnet**

Miner: 0xC9CC2cF97A3a21Fcd337658F6898A7860521A819
Treasury: 0x864eef879b926fddc5615b67301f775d716ab1ca

**Kovan**

Miner: 0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De
Treasury: 0x687025F0E4121a16d4Da737F8625acC0c63ef8Ea

### Deploying to Development

To deploy to development, start a local chain:

```
npx ganache-cli -d -m "12 or 24 word seed phrase" -v
```

Compile and deploy contracts to the chain:

```
MNEMONIC="12 or 24 word seed phrase" INFURA_ID="your-infura-id" npm run deploy:development
```

### Deploying to Staging

Staging refers to Ethereum testnet, in particular the Kovan test chain.

To deploy to staging, compile and deploy contract to testnet:

```
MNEMONIC="12 or 24 word seed phrase" INFURA_ID="your-infura-id" npm run deploy:staging
```

### Deploying to Production

When it is time to deploy contracts to mainnet, use the truffle deployment
directly.

To deploy to mainnet:

```
MNEMONIC="12 or 24 word seed phrase" INFURA_ID="your-infura-id" truffle deploy --network mainnet
```

NOTE that the deployment process to mainnet differs to other deployment
processes because the Miner and Treasury contracts are already deployed.
Therefore, these two contracts are ignored during deployment.

### Deploying to other chains

Other chains can be used for deployment. For example, the MinerToken contracts
can be deployed to another testnet such as Ropsten or even to a different chain
such as Polygon (formerly Matic).

To deploy to a different chain:

```
MNEMONIC="12 or 24 word seed phrase" INFURA_ID="your-infura-id" truffle deploy --network chain-configured-in-truffle-config
```

The chain's details will need to be configured in truffle.js.

### .env

You can also place the MNEMONIC and/or INFURA_ID variables into an .env file.

## Registering a contract on Etherscan

The source code will need to be flattened to register a contract on Etherscan.

To flatten the contract code:

```
cd /path/to/project/files/
npx truffle-flattener contracts/Miner.sol > build/contracts/Miner.flattened.sol
```

Go to Etherscan (https://etherscan.io/) and load the contract. There will be a
"verify" link. Click on this link and specify the following:

Contract Type: single file
Contract Compiler Version: 0.6.4

(There are now two other Contract Types for registering source code; multi-file, and json; these are experimental and will require more investigation).

# Auditing

## Mythril/Truffle Security

Automated audits are run using Truffle Security, the truffle implementation of Mythril.

To install:

```
npm i -D https://github.com/ConsenSys/truffle-security.git
```

or to install from package.json:

```
npm i
```

(NOTE: currently there is a bug in the tag releases for Truffle Security https://github.com/ConsenSys/truffle-security/issues/255. Once this is resolved, the npmjs package will be referenced and these documents updated).

To run a security audit:

Firstly, a Mythx account is required so an API KEY can be registered. An account can be created at https://mythx.io. Once, registered, generate the API KEY and copy it.

Once copied, open up a command line terminal, and, once in the miner-site project directory, declare the API KEY as an environment variable, E.g.

```
export MYTHX_API_KEY=abc123
```

where abc123 is your MYTHX API KEY.

To launch an audit, run:

```
truffle run verify
```

Once completed, you can retrieve the report from your Mythx.io account.

## Solidity coverage

Solidity coverage checks that all tests cover all Solidity contract code.

To install:

```
npm i -D solidity-coverage
```

or to install from package.json:

```
npm i
```

To launch a code coverage test, run:

```
truffle run coverage
```

To see which files are covered by solidity coverage or to add and remove files files from the code coverage, see .solcover.js.
