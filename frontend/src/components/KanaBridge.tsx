'use client';

import { useState, useEffect, useCallback } from 'react';
import { kanaLabsAPI, BridgeQuote, BridgeTransaction } from '@/lib/kana-labs';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getChainName, isChainSupported, getExplorerUrl } from '@/lib/wagmi';

interface KanaBridgeProps {
  className?: string;
}

interface TransactionHistory {
  id: string;
  txHash: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  explorerUrl?: string;
}

export function KanaBridge({ className = '' }: KanaBridgeProps) {
  // Aptos wallet
  const { account: aptosAccount, connected: aptosConnected } = useWallet();
  
  // EVM wallet
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // State
  const [fromChain, setFromChain] = useState('ethereum');
  const [toChain, setToChain] = useState('aptos');
  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [bridging, setBridging] = useState(false);
  const [supportedChains, setSupportedChains] = useState<string[]>([]);
  const [supportedTokens, setSupportedTokens] = useState<Record<string, any>[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'bridge' | 'history'>('bridge');
  const [slippage, setSlippage] = useState('0.5');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper function to get token address
  const getTokenAddress = useCallback((symbol: string, chain: string): `0x${string}` | undefined => {
    const token = supportedTokens.find(t => t.symbol === symbol);
    return token?.address as `0x${string}` | undefined;
  }, [supportedTokens]);

  // Get balance for selected token
  const { data: evmBalance } = useBalance({
    address: evmAddress,
    token: fromToken === 'ETH' ? undefined : getTokenAddress(fromToken, fromChain),
  });

  useEffect(() => {
    loadSupportedChains();
    loadTransactionHistory();
  }, []);

  useEffect(() => {
    if (fromChain) {
      loadSupportedTokens(fromChain);
    }
  }, [fromChain]);

  const loadSupportedChains = async () => {
    try {
      const chains = await kanaLabsAPI.getSupportedChains();
      setSupportedChains(chains);
    } catch (error) {
      console.error('Failed to load supported chains:', error);
      setSupportedChains(['ethereum', 'aptos', 'polygon', 'arbitrum', 'optimism', 'bsc']);
    }
  };

  const loadSupportedTokens = async (chain: string) => {
    try {
      const tokens = await kanaLabsAPI.getSupportedTokens(chain);
      setSupportedTokens(tokens);
    } catch (error) {
      console.error('Failed to load supported tokens:', error);
      setSupportedTokens([
        { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6ba3e0e4ca4ba5cf81b2e8e8e8e8e8e' },
        { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'APT', name: 'Aptos Token', address: '0x1::aptos_coin::AptosCoin' },
      ]);
    }
  };

  const loadTransactionHistory = () => {
    const stored = localStorage.getItem('kana-bridge-history');
    if (stored) {
      setTransactionHistory(JSON.parse(stored));
    }
  };

  const saveTransactionHistory = (transactions: TransactionHistory[]) => {
    localStorage.setItem('kana-bridge-history', JSON.stringify(transactions));
    setTransactionHistory(transactions);
  };



  const getQuote = async () => {
    if (!amount || !fromChain || !toChain || !fromToken || !toToken) return;

    setLoading(true);
    try {
      const bridgeQuote = await kanaLabsAPI.getBridgeQuote(
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount
      );
      setQuote(bridgeQuote);
    } catch (error) {
      console.error('Failed to get bridge quote:', error);
      // Mock quote for demo
      const slippageAmount = parseFloat(amount) * (parseFloat(slippage) / 100);
      const feeAmount = parseFloat(amount) * 0.002;
      setQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        estimatedOutput: (parseFloat(amount) - slippageAmount - feeAmount).toString(),
        fee: feeAmount.toString(),
        estimatedTime: fromChain === 'aptos' || toChain === 'aptos' ? 180 : 300,
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateBridge = async () => {
    if (!quote) return;

    // Check wallet connections
    const isFromAptos = fromChain === 'aptos';
    const isToAptos = toChain === 'aptos';
    
    if (isFromAptos && !aptosConnected) {
      alert('Please connect your Aptos wallet');
      return;
    }
    
    if (!isFromAptos && !evmConnected) {
      alert('Please connect your EVM wallet');
      return;
    }

    setBridging(true);
    try {
      const recipientAddress = isToAptos 
        ? aptosAccount?.address.toString() || ''
        : evmAddress || '';

      if (!recipientAddress) {
        throw new Error('Recipient address not available');
      }

      // Switch to correct chain if needed
      if (!isFromAptos && !isChainSupported(fromChain)) {
        await switchChain({ chainId: getChainId(fromChain) });
      }

      const transaction = await kanaLabsAPI.initiateBridge(
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        recipientAddress
      );
      
      // Add to transaction history
      const newTransaction: TransactionHistory = {
        id: Date.now().toString(),
        txHash: transaction.txHash,
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        status: 'pending',
        timestamp: Date.now(),
        explorerUrl: getExplorerUrl(fromChain, transaction.txHash),
      };
      
      const updatedHistory = [newTransaction, ...transactionHistory];
      saveTransactionHistory(updatedHistory);
      
      // Reset form
      setAmount('');
      setQuote(null);
      setActiveTab('history');
      
      alert(`Bridge initiated successfully! Transaction hash: ${transaction.txHash}`);
    } catch (error) {
      console.error('Failed to initiate bridge:', error);
      alert(`Failed to initiate bridge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBridging(false);
    }
  };

  const getChainId = (chain: string): number => {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      bsc: 56,
    };
    return chainIds[chain] || 1;
  };

  const swapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
  };

  const refreshTransactionStatus = async (txHash: string) => {
    try {
      const status = await kanaLabsAPI.getBridgeStatus(txHash);
      const updatedHistory = transactionHistory.map(tx => 
        tx.txHash === txHash ? { ...tx, status: status.status } : tx
      );
      saveTransactionHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to refresh transaction status:', error);
    }
  };

  const formatBalance = (balance: bigint | undefined, decimals: number = 18): string => {
    if (!balance) return '0';
    return parseFloat(formatEther(balance)).toFixed(4);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 py-4">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bridge'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bridge
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History ({transactionHistory.length})
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'bridge' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Cross-chain Bridge</h3>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Chain Selection */}
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Chain
                  </label>
                  <select
                    value={fromChain}
                    onChange={(e) => setFromChain(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {supportedChains.map((chain) => (
                      <option key={chain} value={chain}>
                        {getChainName(chain)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={swapChains}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Swap chains"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Chain
                  </label>
                  <select
                    value={toChain}
                    onChange={(e) => setToChain(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {supportedChains.map((chain) => (
                      <option key={chain} value={chain}>
                        {getChainName(chain)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Token Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Token
                  </label>
                  <select
                    value={fromToken}
                    onChange={(e) => setFromToken(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {supportedTokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                  {evmBalance && fromChain !== 'aptos' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Balance: {formatBalance(evmBalance.value, Number(evmBalance.decimals))} {fromToken}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Token
                  </label>
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {supportedTokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {evmBalance && fromChain !== 'aptos' && (
                    <button
                      onClick={() => setAmount(formatBalance(evmBalance.value, Number(evmBalance.decimals)))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="bg-gray-50 rounded-md p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Advanced Settings</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slippage Tolerance (%)
                    </label>
                    <div className="flex space-x-2">
                      {['0.1', '0.5', '1.0'].map((value) => (
                        <button
                          key={value}
                          onClick={() => setSlippage(value)}
                          className={`px-3 py-1 rounded text-sm ${
                            slippage === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        step="0.1"
                        min="0"
                        max="50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Get Quote Button */}
              <button
                onClick={getQuote}
                disabled={loading || !amount || !fromChain || !toChain}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Getting Quote...' : 'Get Quote'}
              </button>

              {/* Quote Display */}
              {quote && (
                <div className="bg-gray-50 rounded-md p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Bridge Quote</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>You send:</span>
                      <span className="font-medium">{quote.amount} {quote.fromToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>You receive:</span>
                      <span className="font-medium text-green-600">{quote.estimatedOutput} {quote.toToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bridge fee:</span>
                      <span>{quote.fee} {quote.fromToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated time:</span>
                      <span>{Math.floor(quote.estimatedTime / 60)} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Route:</span>
                      <span className="text-xs">{getChainName(quote.fromChain)} → {getChainName(quote.toChain)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={initiateBridge}
                    disabled={bridging || (!aptosConnected && !evmConnected)}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {bridging ? 'Processing...' : 
                     (!aptosConnected && !evmConnected) ? 'Connect Wallet' : 
                     'Initiate Bridge'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Transaction History */
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
            
            {transactionHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No bridge transactions yet</p>
                <button
                  onClick={() => setActiveTab('bridge')}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Start your first bridge →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionHistory.map((tx) => (
                  <div key={tx.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                          tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => refreshTransactionStatus(tx.txHash)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Refresh
                        </button>
                        {tx.explorerUrl && (
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{tx.amount} {tx.fromToken} from {getChainName(tx.fromChain)} to {getChainName(tx.toChain)}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{tx.txHash}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}