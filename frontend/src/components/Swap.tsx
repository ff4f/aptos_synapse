'use client';

import { useState, useEffect } from 'react';
import { tappExchangeAPI, SwapQuote, TokenInfo } from '@/lib/tapp-exchange';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface SwapProps {
  className?: string;
}

export function Swap({ className = '' }: SwapProps) {
  const { account } = useWallet();
  const [fromToken, setFromToken] = useState('APT');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [slippage, setSlippage] = useState('0.5');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const tokenList = await tappExchangeAPI.getTokenList();
      setTokens(tokenList);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      // Fallback to default tokens
      setTokens([
        { symbol: 'APT', name: 'Aptos', address: '0x1::aptos_coin::AptosCoin', decimals: 8, verified: true },
        { symbol: 'USDC', name: 'USD Coin', address: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T', decimals: 6, verified: true },
        { symbol: 'USDT', name: 'Tether USD', address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T', decimals: 6, verified: true },
        { symbol: 'WETH', name: 'Wrapped Ethereum', address: '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T', decimals: 8, verified: true },
      ]);
    }
  };

  const getQuote = async () => {
    if (!amount || !fromToken || !toToken) return;

    setLoading(true);
    try {
      const swapQuote = await tappExchangeAPI.getSwapQuote(
        fromToken,
        toToken,
        amount,
        parseFloat(slippage)
      );
      setQuote(swapQuote);
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      // Mock quote for demo
      const mockPrice = fromToken === 'APT' && toToken === 'USDC' ? 12.5 : 
                       fromToken === 'USDC' && toToken === 'APT' ? 0.08 : 1;
      const outputAmount = (parseFloat(amount) * mockPrice * (1 - parseFloat(slippage) / 100)).toString();
      
      setQuote({
        inputToken: fromToken,
        outputToken: toToken,
        inputAmount: amount,
        outputAmount: outputAmount,
        priceImpact: '0.1',
        fee: (parseFloat(amount) * 0.003).toString(),
        estimatedGas: '1000',
        route: [{
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn: amount,
          amountOut: outputAmount,
          pool: 'APT-USDC',
          fee: '0.3'
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!account || !quote) return;

    setLoading(true);
    try {
      const transaction = await tappExchangeAPI.executeSwap(
        fromToken,
        toToken,
        amount,
        quote.outputAmount,
        account.address.toString(),
        parseFloat(slippage)
      );
      
      alert(`Swap executed! Transaction hash: ${transaction.hash}`);
    } catch (error) {
      console.error('Failed to execute swap:', error);
      alert('Failed to execute swap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
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
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <div className="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50">
              {quote ? parseFloat(quote.outputAmount).toFixed(6) : '0.0'}
            </div>
          </div>
        </div>

        {/* Get Quote Button */}
        <button
          onClick={getQuote}
          disabled={loading || !amount || fromToken === toToken}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Getting Quote...' : 'Get Quote'}
        </button>

        {/* Quote Display */}
        {quote && (
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Swap Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>You pay:</span>
                <span>{quote.inputAmount} {quote.inputToken}</span>
              </div>
              <div className="flex justify-between">
                <span>You receive:</span>
                <span>{parseFloat(quote.outputAmount).toFixed(6)} {quote.outputToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Price impact:</span>
                <span className={parseFloat(quote.priceImpact) > 1 ? 'text-red-600' : 'text-green-600'}>
                  {quote.priceImpact}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trading fee:</span>
                <span>{quote.fee} {quote.inputToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated gas:</span>
                <span>{quote.estimatedGas}</span>
              </div>
              {quote.route && quote.route.length > 0 && (
                <div className="flex justify-between">
                  <span>Route:</span>
                  <span>{quote.route.map(r => r.pool).join(' → ')}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={executeSwap}
              disabled={loading || !account}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-4"
            >
              {loading ? 'Processing...' : account ? 'Execute Swap' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}