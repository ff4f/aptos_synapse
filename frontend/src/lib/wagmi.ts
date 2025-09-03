import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, polygon, arbitrum, optimism } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id';

// Configure chains
export const chains = [
  mainnet,
  sepolia, // Ethereum testnet
  polygon,
  arbitrum,
  optimism,
] as const;

// Configure connectors
const connectors = [
  injected(),
  metaMask(),
  walletConnect({
    projectId,
    metadata: {
      name: 'Aptos Synapse',
      description: 'Cross-chain DeFi platform bridging Aptos and EVM ecosystems',
      url: 'https://aptos-synapse.com',
      icons: ['https://aptos-synapse.com/icon.png'],
    },
  }),
];

// Create wagmi config
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
});

// Chain configurations for different environments
export const chainConfig = {
  development: {
    aptos: {
      network: 'testnet',
      nodeUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
      faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    },
    evm: {
      defaultChain: sepolia,
      supportedChains: [sepolia, polygon],
    },
  },
  production: {
    aptos: {
      network: 'mainnet',
      nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    },
    evm: {
      defaultChain: mainnet,
      supportedChains: [mainnet, polygon, arbitrum, optimism],
    },
  },
};

// Get current environment config
export const currentConfig = chainConfig[
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
];

// Helper functions
export function getChainName(chainId: number): string {
  const chain = chains.find(c => c.id === chainId);
  return chain?.name || `Chain ${chainId}`;
}

export function isChainSupported(chainId: number): boolean {
  return currentConfig.evm.supportedChains.some(chain => chain.id === chainId);
}

export function getExplorerUrl(chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string {
  const chain = chains.find(c => c.id === chainId);
  if (!chain?.blockExplorers?.default) return '';
  
  const baseUrl = chain.blockExplorers.default.url;
  return `${baseUrl}/${type}/${hash}`;
}

// Contract addresses for different chains
export const contractAddresses = {
  // Ethereum Mainnet
  [mainnet.id]: {
    bridge: '0x...', // Bridge contract address
    token: '0x...', // Token contract address
  },
  // Sepolia Testnet
  [sepolia.id]: {
    bridge: '0x...', // Bridge contract address
    token: '0x...', // Token contract address
  },
  // Polygon
  [polygon.id]: {
    bridge: '0x...', // Bridge contract address
    token: '0x...', // Token contract address
  },
};

// Get contract address for current chain
export function getContractAddress(chainId: number, contract: 'bridge' | 'token'): string {
  return contractAddresses[chainId as keyof typeof contractAddresses]?.[contract] || '';
}

// Network switching helper
export async function switchToChain(chainId: number) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available');
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // Chain not added to MetaMask
    if (error.code === 4902) {
      const chain = chains.find(c => c.id === chainId);
      if (chain) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${chainId.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrls.default.http[0]],
              blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : [],
            },
          ],
        });
      }
    } else {
      throw error;
    }
  }
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}