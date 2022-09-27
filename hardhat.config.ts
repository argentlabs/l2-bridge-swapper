import { HardhatUserConfig } from "hardhat/types";
import '@typechain/hardhat';
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@rumblefishdev/hardhat-kms-signer";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      },
    },
    dev: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      kmsKeyId: process.env.TEST_KMSID, // using the TEST key on the DEV env on purpose
      chainId: 4,
    },
    test: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      kmsKeyId: process.env.TEST_KMSID,
      chainId: 3,
    },
    hydrogen: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [`0x${process.env.HYDROGEN_PKEY}`],
      chainId: 5,
    },
    staging: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      kmsKeyId: process.env.STAGING_KMSID,
      chainId: 1,
    },
    prod: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      kmsKeyId: process.env.PROD_KMSID,
      chainId: 1,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 1000000
  },
};

export default config;