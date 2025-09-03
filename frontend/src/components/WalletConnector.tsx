'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Types
interface WalletState {
  // Aptos wallet
  aptosConnected: boolean;
  aptosAddress: string | null;
  aptosWalletName: string | null;
  
  // EVM wallet
  evmConnected: boolean;
  evmAddress: string | null;
  evmChainId: number | null;
  
  // Actions
  connectAptos: () => Promise<void>;
  disconnectAptos: () => Promise<void>;
  connectEVM: (connector: 'metamask' | 'walletconnect') => Promise<void>;
  disconnectEVM: () => Promise<void>;
  
  // Status
  isLoading: boolean;
  error: string | null;
}

// Context
const WalletContext = createContext<WalletState | null>(null);

// Hook
export function useWalletConnector() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletConnector must be used within WalletConnectorProvider');
  }
  return context;
}

// Provider
interface WalletConnectorProviderProps {
  children: ReactNode;
}

export function WalletConnectorProvider({ children }: WalletConnectorProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Aptos wallet hooks
  const { 
    connected: aptosConnected, 
    account: aptosAccount, 
    connect: aptosConnect, 
    disconnect: aptosDisconnect,
    wallet: aptosWallet,
    wallets: aptosWallets
  } = useWallet();
  
  // EVM wallet hooks
  const { 
    address: evmAddress, 
    isConnected: evmConnected, 
    chainId: evmChainId 
  } = useAccount();
  const { connect: evmConnect } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();
  
  // Connect Aptos wallet
  const connectAptos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (aptosWallets.length > 0) {
        // Try Petra first, then Martian, then any available
        const petraWallet = aptosWallets.find(w => w.name.toLowerCase().includes('petra'));
        const martianWallet = aptosWallets.find(w => w.name.toLowerCase().includes('martian'));
        const targetWallet = petraWallet || martianWallet || aptosWallets[0];
        
        await aptosConnect(targetWallet.name);
      } else {
        throw new Error('No Aptos wallets available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Aptos wallet');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Disconnect Aptos wallet
  const disconnectAptos = async () => {
    try {
      setIsLoading(true);
      await aptosDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Aptos wallet');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Connect EVM wallet
  const connectEVM = async (connectorType: 'metamask' | 'walletconnect') => {
    try {
      setIsLoading(true);
      setError(null);
      
      let connector;
      switch (connectorType) {
        case 'metamask':
          connector = metaMask();
          break;
        case 'walletconnect':
          connector = walletConnect({
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
          });
          break;
        default:
          connector = injected();
      }
      
      await evmConnect({ connector });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect EVM wallet');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Disconnect EVM wallet
  const disconnectEVMWallet = async () => {
    try {
      setIsLoading(true);
      evmDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect EVM wallet');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  const value: WalletState = {
    // Aptos
    aptosConnected,
    aptosAddress: aptosAccount?.address?.toString() || null,
    aptosWalletName: aptosWallet?.name || null,
    
    // EVM
    evmConnected,
    evmAddress: evmAddress || null,
    evmChainId: evmChainId || null,
    
    // Actions
    connectAptos,
    disconnectAptos,
    connectEVM,
    disconnectEVM: disconnectEVMWallet,
    
    // Status
    isLoading,
    error,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Wallet Connector Component
export function WalletConnector() {
  const {
    aptosConnected,
    aptosAddress,
    aptosWalletName,
    evmConnected,
    evmAddress,
    evmChainId,
    connectAptos,
    disconnectAptos,
    connectEVM,
    disconnectEVM,
    isLoading,
    error
  } = useWalletConnector();
  
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className="relative">
      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm z-50 min-w-64">
          {error}
        </div>
      )}
      
      {/* Main Wallet Button */}
      <div className="flex items-center gap-2">
        {/* Aptos Wallet Status */}
        {aptosConnected ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-md">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700">
              Aptos: {aptosAddress?.slice(0, 6)}...{aptosAddress?.slice(-4)}
            </span>
            <button
              onClick={disconnectAptos}
              className="text-green-600 hover:text-green-800 text-xs"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={connectAptos}
            disabled={isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Connecting...' : 'Connect Aptos'}
          </button>
        )}
        
        {/* EVM Wallet Status */}
        {evmConnected ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 border border-purple-300 rounded-md">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-sm font-medium text-purple-700">
              EVM: {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}
            </span>
            <span className="text-xs text-purple-600">Chain: {evmChainId}</span>
            <button
              onClick={disconnectEVM}
              className="text-purple-600 hover:text-purple-800 text-xs"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Connecting...' : 'Connect EVM'}
            </button>
            
            {/* EVM Wallet Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-40">
                <button
                  onClick={() => {
                    connectEVM('metamask');
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  MetaMask
                </button>
                <button
                  onClick={() => {
                    connectEVM('walletconnect');
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm border-t border-gray-200"
                >
                  WalletConnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Connection Status */}
      <div className="mt-2 text-xs text-gray-600">
        {aptosConnected && evmConnected ? (
          <span className="text-green-600 font-medium">✓ Dual wallet connected</span>
        ) : aptosConnected ? (
          <span className="text-blue-600">Aptos connected • Connect EVM for full features</span>
        ) : evmConnected ? (
          <span className="text-purple-600">EVM connected • Connect Aptos for full features</span>
        ) : (
          <span className="text-gray-500">Connect both wallets for full cross-chain features</span>
        )}
      </div>
    </div>
  );
}

// Compact Wallet Status Component
export function WalletStatus() {
  const {
    aptosConnected,
    aptosAddress,
    evmConnected,
    evmAddress,
  } = useWalletConnector();
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        aptosConnected ? 'bg-green-500' : 'bg-gray-300'
      }`}></div>
      <span className={aptosConnected ? 'text-green-700' : 'text-gray-500'}>
        Aptos
      </span>
      
      <div className={`w-2 h-2 rounded-full ${
        evmConnected ? 'bg-purple-500' : 'bg-gray-300'
      }`}></div>
      <span className={evmConnected ? 'text-purple-700' : 'text-gray-500'}>
        EVM
      </span>
    </div>
  );
}