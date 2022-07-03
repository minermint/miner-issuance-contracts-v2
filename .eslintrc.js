module.exports = {
  settings: {
    node: {
      tryExtensions: [".ts"],
    },
  },
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "node/no-unsupported-features/es-syntax": [
      "error",
      { ignores: ["modules"] },
    ],
    "node/no-missing-import": [
      "error",
      {
        allowModules: ["hardhat", "dotenv"],
      },
    ],
    "node/no-extraneous-import": [
      "error",
      {
        allowModules: ["ethereum-waffle"],
      },
    ],
  },
};
