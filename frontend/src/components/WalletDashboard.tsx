'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { noditClient } from '@/lib/nodit';

interface WalletData {
  aptosBalance: string;
  ethBalance: string;
  tokens: any[];
  transactions: any[];
}

export const WalletDashboard = () => {
  const { account } = useWallet();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [aptosBalance, ethBalance, tokens] = await Promise.all([
          noditClient.getAptosBalance(account.address.toString()),
          noditClient.getEthereumBalance(account.address.toString()).then(data => data.balanceInEth),
          noditClient.getAptosTokenBalances(account.address.toString()),
        ]);

        setWalletData({
          aptosBalance,
          ethBalance,
          tokens,
          transactions: [], // Would fetch separately
        });

      } catch (err: any) {
        console.error('Error fetching wallet data:', err);
        setError(err.message || 'Failed to fetch wallet data');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [account]);

  if (!account) {
    return (
      <div className="wallet-dashboard bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Wallet Overview</h3>
        <p className="text-gray-400">Please connect your wallet to view dashboard</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wallet-dashboard bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Wallet Overview</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-400">Loading wallet data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-dashboard bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Wallet Overview</h3>
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-dashboard bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Wallet Overview</h3>
      
      {walletData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="balance-card bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors">
            <h4 className="text-sm text-gray-400 mb-1">APT Balance</h4>
            <p className="text-2xl font-bold text-white">
              {parseFloat(walletData.aptosBalance).toFixed(4)} APT
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ${(parseFloat(walletData.aptosBalance) * 8.5).toFixed(2)} USD
            </p>
          </div>
          
          <div className="balance-card bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors">
            <h4 className="text-sm text-gray-400 mb-1">ETH Balance</h4>
            <p className="text-2xl font-bold text-white">
              {parseFloat(walletData.ethBalance).toFixed(4)} ETH
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ${(parseFloat(walletData.ethBalance) * 3200).toFixed(2)} USD
            </p>
          </div>

          <div className="tokens-card bg-gray-700 p-4 rounded-lg md:col-span-2">
            <h4 className="text-sm text-gray-400 mb-3">Token Holdings</h4>
            {walletData.tokens.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {walletData.tokens.slice(0, 10).map((token, index) => (
                  <div key={token.coin_type || index} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{token.symbol || token.name || 'Unknown Token'}</span>
                      <span className="text-xs text-gray-400 truncate max-w-xs">{token.coin_type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-medium">
                        {(parseFloat(token.amount) / Math.pow(10, token.decimals || 8)).toFixed(4)}
                      </span>
                      <p className="text-xs text-gray-400">{token.symbol}</p>
                    </div>
                  </div>
                ))}
                {walletData.tokens.length > 10 && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    +{walletData.tokens.length - 10} more tokens
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No tokens found</p>
            )}
          </div>

          <div className="account-info bg-gray-700 p-4 rounded-lg md:col-span-2">
            <h4 className="text-sm text-gray-400 mb-2">Account Information</h4>
            <div className="space-y-1">
              <p className="text-xs text-gray-300">
                <span className="text-gray-400">Address:</span> 
                <span className="font-mono ml-2">{account.address.toString()}</span>
              </p>
              <p className="text-xs text-gray-300">
                <span className="text-gray-400">Network:</span> 
                <span className="ml-2">Aptos Testnet</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;