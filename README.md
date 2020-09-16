# Miner Token Contracts

# Dev Debugging Environment Setup

# Contract addresses

### Mainnet
Mainnet: ``

### Ropsten
Mnemonic Phrase: `...`

Owner Address `m/44'/60'/0'/0`: `0x`

Owner Private Key: `0x`

xPub key from: `m/44'/60'/0'/x`
Contract Address: `0x`

## Owner addresses

| Index | Public Key | Private |
| --- | --- | --- |
| 0 | `0xa1138fccd5f8E126E8d779CF78a547517307559d` | `0x600f003a6ed434917afbbc7f03f2edf86a19f72448e2e9d05917e73e502f6970` |
| 1 | `0xbd9F7DAEe6d5Fc5595567AeD84f0f52D694F056C` | `0x60f54928d665c30e3055863a7254d0eb9dc5d4aa14ef2b1af230085c690adada` |
| 2 | `0x9e1525DA6AB3498dda99B97dc13E79f4c44b79d8` | `0x90b00e527c4ad18ee427fe1ee074eec77e33378796a24b8ae35970210acc3274` |

# Building Contracts

## Deploying a contract

Contracts can be deployed to the various networks configured in truffle.js.

To set up your environment for deploying contracts, you will need to create a
.env file. .env defines the various Ethereum blockchain environment variable.

```
cp env.example .env
```

Once created, change the mnemonic and network settings to match your environment.

To deploy a contract to a network, run:

```
truffle deploy --network NETWORK_NAME
```

where NETWORK_NAME is the network you wish to deploy to. The names of the various networks are listed in truffle.js.

For example, to deploy to Ropsten:

```
truffle deploy --network ropsten
```

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
