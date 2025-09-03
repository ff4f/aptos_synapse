'use client';

import { useWallet } from '@aptos-labs/wallet-adapter-react';

// Simple Button component
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
}

function Button({ onClick, children, className = '', variant = 'default', size = 'default' }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variantClasses = variant === 'outline' 
    ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    : 'bg-blue-600 text-white hover:bg-blue-700';
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2';
  
  return (
    <button 
      onClick={onClick} 
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export function WalletButton() {
  const { connected, account, connect, disconnect, wallets } = useWallet();

  const handleConnect = async () => {
    if (wallets.length > 0) {
      try {
        await connect(wallets[0].name);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  if (connected && account) {
    const addressStr = account.address.toString();
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {addressStr.slice(0, 6)}...{addressStr.slice(-4)}
        </span>
        <Button onClick={disconnect} variant="outline" size="sm">
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700">
      Connect Wallet
    </Button>
  );
}