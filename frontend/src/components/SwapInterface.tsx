'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { TappClient, SwapParams, SwapQuote } from '@/lib/tapp-exchange';

interface SwapState {
  status: 'idle' | 'getting_quote' | 'signing' | 'submitting' | 'success' | 'error';
  quote?: SwapQuote;
  error?: string;
  transactionHash?: string;
}

export const SwapInterface = () => {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [swapParams, setSwapParams] = useState<SwapParams>({
    fromToken: 'APT',
    toToken: 'USDT',
    fromAmount: '0',
    slippage: 0.5
  });
  
  const [swapState, setSwapState] = useState<SwapState>({ status: 'idle' });
  const [tokenList, setTokenList] = useState<any[]>([]);

  useEffect(() => {
    // Load token list on component mount
    const loadTokenList = async () => {
      try {
        const tappClient = new TappClient('testnet');
        const tokens = await tappClient.getTokenList();
        console.log('SwapInterface loaded tokens:', tokens);
        setTokenList(tokens);
      } catch (error) {
        console.error('Failed to load token list:', error);
        // This should not happen anymore since getTokenList now handles fallbacks internally
        setTokenList([]);
      }
    };

    loadTokenList();
  }, []);

  const handleGetQuote = async () => {
    if (!connected || !account || !swapParams.fromAmount || parseFloat(swapParams.fromAmount) <= 0) {
      setSwapState({ status: 'error', error: 'Please connect wallet and enter a valid amount' });
      return;
    }

    setSwapState({ status: 'getting_quote' });
    
    try {
      const tappClient = new TappClient('testnet');
      const quote = await tappClient.getSwapQuote(swapParams);
      setSwapState({ status: 'idle', quote });
    } catch (error: any) {
      setSwapState({ status: 'error', error: error.message });
    }
  };

  const executeSwap = async () => {
    if (!swapState.quote || !account) {
      setSwapState({ status: 'error', error: 'No quote available or wallet not connected' });
      return;
    }

    setSwapState({ status: 'signing' });

    try {
      // Sign the unsigned payload with wallet
      const response = await signAndSubmitTransaction({
        data: swapState.quote.unsignedPayload,
        sender: account.address
      });

      setSwapState({ status: 'submitting' });

      // Submit signed transaction to Tapp Exchange
      const tappClient = new TappClient('testnet');
      const transactionHash = await tappClient.submitSignedTransaction(response.hash);
      
      setSwapState({ 
        status: 'success', 
        transactionHash,
        quote: swapState.quote 
      });

    } catch (error: any) {
      setSwapState({ status: 'error', error: error.message });
    }
  };

  return (
    <div className="swap-interface bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-white">Tapp Exchange Swap</h3>
      
      {/* Swap Form UI */}
      <div className="space-y-4">
        {/* From Token Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">From Token</label>
          <select 
            value={swapParams.fromToken}
            onChange={(e) => setSwapParams({...swapParams, fromToken: e.target.value})}
            className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {tokenList.map(token => (
              <option key={token.address} value={token.symbol}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>

        {/* To Token Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">To Token</label>
          <select 
            value={swapParams.toToken}
            onChange={(e) => setSwapParams({...swapParams, toToken: e.target.value})}
            className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {tokenList.map(token => (
              <option key={token.address} value={token.symbol}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Amount</label>
          <input
            type="number"
            value={swapParams.fromAmount}
            onChange={(e) => setSwapParams({...swapParams, fromAmount: e.target.value})}
            placeholder="0.0"
            min="0"
            step="0.0001"
            className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
          />
        </div>

        {/* Slippage Tolerance */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Slippage Tolerance (%)</label>
          <input
            type="number"
            value={swapParams.slippage}
            onChange={(e) => setSwapParams({...swapParams, slippage: parseFloat(e.target.value)})}
            step="0.1"
            min="0.1"
            max="5"
            className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleGetQuote}
            disabled={swapState.status === 'getting_quote' || !connected}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg transition-colors font-medium"
          >
            {swapState.status === 'getting_quote' ? 'Getting Quote...' : 'Get Quote'}
          </button>

          <button
            onClick={executeSwap}
            disabled={!swapState.quote || swapState.status !== 'idle' || !connected}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-6 rounded-lg transition-colors font-medium"
          >
            Execute Swap
          </button>
        </div>
      </div>

      {/* Status and Result Display */}
      <div className="mt-6">
        {swapState.quote && (
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2 text-white">Quote Details</h4>
            <div className="text-gray-300 space-y-1">
              <p>Input: {swapState.quote.fromAmount} {swapState.quote.fromToken}</p>
              <p>Output: {swapState.quote.toAmount} {swapState.quote.toToken}</p>
              <p>Price Impact: {swapState.quote.priceImpact}%</p>
              <p>Minimum Received: {swapState.quote.minAmountOut} {swapState.quote.toToken}</p>
            </div>
          </div>
        )}

        {swapState.status === 'signing' && (
          <div className="bg-yellow-600 p-3 rounded-lg mb-4">
            <p className="text-white">Signing transaction with your wallet...</p>
          </div>
        )}

        {swapState.status === 'submitting' && (
          <div className="bg-yellow-600 p-3 rounded-lg mb-4">
            <p className="text-white">Submitting transaction to Tapp Exchange...</p>
          </div>
        )}

        {swapState.status === 'success' && swapState.transactionHash && (
          <div className="bg-green-600 p-3 rounded-lg mb-4">
            <p className="font-semibold text-white">Swap successful! 🎉</p>
            <p className="text-sm text-green-100">Transaction Hash: {swapState.transactionHash}</p>
            <a 
              href={`https://explorer.aptoslabs.com/txn/${swapState.transactionHash}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-100 underline text-sm"
            >
              View on Explorer
            </a>
          </div>
        )}

        {swapState.status === 'error' && (
          <div className="bg-red-600 p-3 rounded-lg mb-4">
            <p className="font-semibold text-white">Error</p>
            <p className="text-red-100">{swapState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};