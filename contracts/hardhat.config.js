import "@nomicfoundation/hardhat-toolbox";

export default {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          evmVersion: "cancun",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
