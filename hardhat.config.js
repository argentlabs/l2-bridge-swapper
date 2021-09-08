require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      },
    },
    dev: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [`0x${process.env.DEV_PKEY}`],
      chainId: 4,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.3",
      },
    ],
  },
};
