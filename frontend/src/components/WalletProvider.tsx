'use client';

import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dappConfig } from '@/lib/wallet';
import { wagmiConfig } from '@/lib/wagmi';
import { WalletConnectorProvider } from './WalletConnector';
import { PropsWithChildren } from 'react';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export function WalletProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AptosWalletAdapterProvider
          autoConnect={true}
          dappConfig={dappConfig}
          onError={(error) => {
            console.error('Aptos wallet connection error:', error);
          }}
        >
          <WalletConnectorProvider>
            {children}
          </WalletConnectorProvider>
        </AptosWalletAdapterProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}