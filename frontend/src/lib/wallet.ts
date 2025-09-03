import { Network } from '@aptos-labs/ts-sdk';

// Wallet configuration - using built-in wallet support
export const wallets = [
  // Wallets will be auto-detected by the adapter
];

export const aptosConfig = {
  network: Network.TESTNET,
  nodeUrl: process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
  faucetUrl: process.env.NEXT_PUBLIC_APTOS_FAUCET_URL || 'https://faucet.testnet.aptoslabs.com',
};

export const dappConfig = {
  network: aptosConfig.network,
  aptosConnectDappId: 'aptos-synapse',
  mizuwallet: {
    manifestURL: 'https://assets.mz.xyz/static/config/mizuwallet-connect-manifest.json',
  },
};