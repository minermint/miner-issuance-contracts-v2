# Miner Token Issuance Contracts

# Building Contracts

```
npm run compile
```

## Deploying a contract

Contracts can be deployed to the various networks configured in Hardhat config.

You will need a mnenomic or private key to deploy contracts to various networks.

To deploy a contract to a network, run one of the deployment targets. There are
convenience npm targets you can run to deploy to development or staging.

### Miner Token and Treasury Contracts

The Miner (MINER) token is already deployed. Any issuance tests against Miner should be executed against a version available on a live network (mainnet or testnet).

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
npm run deploy:development -- --fork remote_api_url
```

### Deploying to Staging

Staging refers to Ethereum testnet, in particular the Kovan test chain.

To deploy to staging, compile and deploy contract to testnet:

```
npm run deploy:staging
```

### Deploying to Production

When it is time to deploy contracts to mainnet, use the Hardhat cli
directly.

To deploy to mainnet:

```
npx hardhat deploy --network mainnet
```

### .env

You can also place the MNEMONIC and/or INFURA_ID variables into an .env file.

## Registering a contract on Etherscan and Sourcify

```
npx hardhat etherscan-verify
```

```
npx hardhat sourcify
```

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
mythx analyze ./contracts/ --remap-import "@openzeppelin/=$(pwd)/node_modules/@openzeppelin/" --remap-import "@un
iswap/=$(pwd)/node_modules/@uniswap/" --remap-import "@chainlink/=$(pwd)/node_modules/@chainlink/" --solc-version 0.8.9
```

Once completed, you can retrieve the report from your Mythx.io account.

## Solidity coverage

Solidity coverage checks that all tests cover all Solidity contract code.

To launch a code coverage test, run:

```
npx hardhat coverage
```

To fully evaluate the test coverage of contracts, open ./coverage/index.html.
