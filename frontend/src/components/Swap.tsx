'use client';

import { useState, useEffect } from 'react';
import { tappExchangeAPI, SwapQuote, TokenInfo, SwapParams } from '@/lib/tapp-exchange';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface SwapProps {
  className?: string;
}

interface SwapState {
  status: 'idle' | 'getting_quote' | 'signing' | 'submitting' | 'success' | 'error';
  quote?: SwapQuote;
  error?: string;
  transactionHash?: string;
}

export function Swap({ className = '' }: SwapProps) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [fromToken, setFromToken] = useState('APT');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [swapState, setSwapState] = useState<SwapState>({ status: 'idle' });
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [slippage, setSlippage] = useState('0.5');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const tokenList = await tappExchangeAPI.getTokenList();
      console.log('Loaded tokens:', tokenList);
      setTokens(tokenList);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      // This should not happen anymore since getTokenList now handles fallbacks internally
      setTokens([]);
    }
  };

  const getQuote = async () => {
    if (!account || !amount || parseFloat(amount) <= 0) {
      setSwapState({ status: 'error', error: 'Invalid amount or not connected' });
      return;
    }

    setSwapState({ status: 'getting_quote' });
    
    try {
      const swapParams: SwapParams = {
        fromToken,
        toToken,
        fromAmount: amount,
        slippage: parseFloat(slippage)
      };
      const quote = await tappExchangeAPI.getSwapQuote(swapParams);
      setSwapState({ status: 'idle', quote });
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      // Mock quote for demo
      const mockPrice = fromToken === 'APT' && toToken === 'USDC' ? 12.5 : 
                       fromToken === 'USDC' && toToken === 'APT' ? 0.08 : 1;
      const outputAmount = (parseFloat(amount) * mockPrice * (1 - parseFloat(slippage) / 100)).toString();
      
      setSwapState({
        status: 'idle',
        quote: {
          fromToken: fromToken,
          toToken: toToken,
          fromAmount: amount,
          toAmount: outputAmount,
          minAmountOut: (parseFloat(outputAmount) * 0.99).toString(),
          priceImpact: 0.1,
          route: [{
            tokenIn: fromToken,
            tokenOut: toToken,
            amountIn: amount,
            amountOut: outputAmount,
            pool: 'APT-USDC',
            fee: '0.3'
          }],
          unsignedPayload: {
            function: '0x1::coin::transfer',
            type_arguments: [],
            arguments: []
          }
        }
      });
    }
  };

  const executeSwap = async () => {
    if (!swapState.quote || !account) {
      setSwapState({ status: 'error', error: 'No quote available or wallet not connected' });
      return;
    }

    setSwapState({ status: 'signing' });

    try {
      // Sign the transaction with wallet
      const response = await signAndSubmitTransaction({
        data: swapState.quote.unsignedPayload,
        sender: account.address
      });

      setSwapState({ status: 'submitting' });

      // Submit signed transaction to Tapp.Exchange
      const transactionHash = await tappExchangeAPI.submitSignedTransaction(response.hash);
      
      setSwapState({ 
        status: 'success', 
        transactionHash,
        quote: swapState.quote 
      });

    } catch (error) {
      console.error('Failed to execute swap:', error);
      setSwapState({ status: 'error', error: (error as Error).message });
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setSwapState({ status: 'idle' });
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Token Swap</h3>
      
      <div className="space-y-4">
        {/* Slippage Settings */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Slippage Tolerance</span>
          <div className="flex space-x-2">
            {['0.1', '0.5', '1.0'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-3 py-1 text-xs rounded ${
                  slippage === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>

        {/* From Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From
          </label>
          <div className="flex space-x-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="flex-1 p-3 border border-gray-400 rounded-lg bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              {tokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 p-3 border border-gray-400 rounded-lg bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center">
          <button
            onClick={switchTokens}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To
          </label>
          <div className="flex space-x-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="flex-1 p-3 border border-gray-400 rounded-lg bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              {tokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <div className="flex-1 p-3 border border-gray-400 rounded-lg bg-gray-50 text-gray-900">
              {swapState.quote ? parseFloat(swapState.quote.toAmount).toFixed(6) : '0.0'}
            </div>
          </div>
        </div>

        {/* Get Quote Button */}
        <button
          onClick={getQuote}
          disabled={swapState.status === 'getting_quote' || !amount || fromToken === toToken}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {swapState.status === 'getting_quote' ? 'Getting Quote...' : 'Get Quote'}
        </button>

        {/* Error Display */}
        {swapState.status === 'error' && swapState.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {swapState.error}
          </div>
        )}

        {/* Success Display */}
        {swapState.status === 'success' && swapState.transactionHash && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Swap successful! Transaction: {swapState.transactionHash}
          </div>
        )}

        {/* Quote Display */}
        {swapState.quote && (
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Swap Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>You pay:</span>
                <span>{swapState.quote.fromAmount} {swapState.quote.fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span>You receive:</span>
                <span>{parseFloat(swapState.quote.toAmount).toFixed(6)} {swapState.quote.toToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Price impact:</span>
                <span className={parseFloat(swapState.quote.priceImpact.toString()) > 1 ? 'text-red-600' : 'text-green-600'}>
                  {swapState.quote.priceImpact}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Min amount out:</span>
                <span>{swapState.quote.minAmountOut} {swapState.quote.toToken}</span>
              </div>
              {swapState.quote.route && swapState.quote.route.length > 0 && (
                <div className="flex justify-between">
                  <span>Route:</span>
                  <span>{swapState.quote.route.map(r => r.pool).join(' → ')}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={executeSwap}
              disabled={['signing', 'submitting'].includes(swapState.status) || !account}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-4"
            >
              {swapState.status === 'signing' ? 'Signing...' : 
               swapState.status === 'submitting' ? 'Submitting...' : 
               account ? 'Execute Swap' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}