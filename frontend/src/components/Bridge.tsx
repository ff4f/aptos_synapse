'use client';

import { useState, useEffect } from 'react';
import { kanaLabsAPI, BridgeQuote } from '@/lib/kana-labs';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface BridgeProps {
  className?: string;
}

export function Bridge({ className = '' }: BridgeProps) {
  const { account } = useWallet();
  const [fromChain, setFromChain] = useState('ethereum');
  const [toChain, setToChain] = useState('aptos');
  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [supportedChains, setSupportedChains] = useState<string[]>([]);

  useEffect(() => {
    loadSupportedChains();
  }, []);

  const loadSupportedChains = async () => {
    try {
      const chains = await kanaLabsAPI.getSupportedChains();
      setSupportedChains(chains);
    } catch (error) {
      console.error('Failed to load supported chains:', error);
      // Fallback to default chains
      setSupportedChains(['ethereum', 'aptos', 'polygon', 'bsc']);
    }
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
      setQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        estimatedOutput: (parseFloat(amount) * 0.998).toString(),
        fee: (parseFloat(amount) * 0.002).toString(),
        estimatedTime: 300, // 5 minutes
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateBridge = async () => {
    if (!account || !quote) return;

    setLoading(true);
    try {
      const transaction = await kanaLabsAPI.initiateBridge(
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        account.address.toString()
      );
      
      alert(`Bridge initiated! Transaction hash: ${transaction.txHash}`);
    } catch (error) {
      console.error('Failed to initiate bridge:', error);
      alert('Failed to initiate bridge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Cross-chain Bridge</h3>
      
      <div className="space-y-4">
        {/* From Chain */}
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
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* To Chain */}
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
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
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
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="ETH">ETH</option>
              <option value="BTC">BTC</option>
            </select>
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
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="APT">APT</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Get Quote Button */}
        <button
          onClick={getQuote}
          disabled={loading || !amount}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Getting Quote...' : 'Get Quote'}
        </button>

        {/* Quote Display */}
        {quote && (
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Bridge Quote</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>You send:</span>
                <span>{quote.amount} {quote.fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span>You receive:</span>
                <span>{quote.estimatedOutput} {quote.toToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Bridge fee:</span>
                <span>{quote.fee} {quote.fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated time:</span>
                <span>{Math.floor(quote.estimatedTime / 60)} minutes</span>
              </div>
            </div>
            
            <button
              onClick={initiateBridge}
              disabled={loading || !account}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-4"
            >
              {loading ? 'Processing...' : account ? 'Initiate Bridge' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}