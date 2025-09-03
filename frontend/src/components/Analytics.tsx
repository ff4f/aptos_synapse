'use client';

import { useState, useEffect, useCallback } from 'react';
import { hyperionAPI, UserAnalytics, ProtocolAnalytics, TokenMetrics } from '@/lib/hyperion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface AnalyticsProps {
  className?: string;
}

export function Analytics({ className = '' }: AnalyticsProps) {
  const { account } = useWallet();
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [protocolAnalytics, setProtocolAnalytics] = useState<ProtocolAnalytics | null>(null);
  const [tokenAnalytics, setTokenAnalytics] = useState<TokenMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'protocol' | 'tokens'>('protocol');

  const loadUserAnalytics = useCallback(async () => {
    if (!account) return;

    setLoading(true);
    try {
      const analytics = await hyperionAPI.getUserAnalytics(account.address.toString());
      setUserAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load user analytics:', error);
      // Mock data for demo
      setUserAnalytics({
        address: account.address.toString(),
        totalTransactions: 156,
        totalVolume: '45,230.50',
        averageTransactionSize: '290.45',
        mostUsedTokens: [
          { token: '0x1::aptos_coin::AptosCoin', symbol: 'APT', count: 45, volume: '1,569.25' },
          { token: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T', symbol: 'USDC', count: 78, volume: '8,450.00' },
          { token: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T', symbol: 'USDT', count: 33, volume: '2,431.25' }
        ],
        activityScore: 85,
        riskScore: 65
      });
    } finally {
      setLoading(false);
    }
  }, [account]);

  const loadProtocolAnalytics = useCallback(async () => {


    setLoading(true);
    try {
      const analytics = await hyperionAPI.getProtocolAnalytics();
      setProtocolAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load protocol analytics:', error);
      // Mock data for demo
      setProtocolAnalytics({
        totalValueLocked: '2,450,000,000',
        totalUsers: 450000,
        totalTransactions: 12500000,
        dailyActiveUsers: 25000,
        weeklyActiveUsers: 125000,
        monthlyActiveUsers: 450000,
        averageTransactionValue: '125.50',
        topTokens: [
          { address: '0x1::aptos_coin::AptosCoin', symbol: 'APT', name: 'Aptos', price: '12.45', marketCap: '3,200,000,000', volume24h: '45,000,000', change24h: '+5.2%', holders: 125000 },
          { address: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T', symbol: 'USDC', name: 'USD Coin', price: '1.00', marketCap: '1,800,000,000', volume24h: '28,000,000', change24h: '+0.1%', holders: 89000 },
          { address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T', symbol: 'USDT', name: 'Tether USD', price: '1.00', marketCap: '1,200,000,000', volume24h: '12,000,000', change24h: '-0.05%', holders: 67000 }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTokenAnalytics = useCallback(async () => {


    try {
      const analytics = await hyperionAPI.getTopTokens(10);
      setTokenAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load token analytics:', error);
      // Mock data for demo
      setTokenAnalytics([
        {
          address: '0x1::aptos_coin::AptosCoin',
          symbol: 'APT',
          name: 'Aptos',
          price: '12.45',
          change24h: '+5.2%',
          volume24h: '45,000,000',
          marketCap: '3,200,000,000',
          holders: 125000
        },
        {
          address: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T',
          symbol: 'USDC',
          name: 'USD Coin',
          price: '1.00',
          change24h: '+0.1%',
          volume24h: '28,000,000',
          marketCap: '1,800,000,000',
          holders: 89000
        },
        {
          address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T',
          symbol: 'USDT',
          name: 'Tether USD',
          price: '1.00',
          change24h: '-0.05%',
          volume24h: '22,000,000',
          marketCap: '1,200,000,000',
          holders: 67000
        }
      ]);
    }
  }, []);

  useEffect(() => {
    loadProtocolAnalytics();
    loadTokenAnalytics();
  }, [loadProtocolAnalytics, loadTokenAnalytics]);

  useEffect(() => {
    if (account) {
      loadUserAnalytics();
    }
  }, [account, loadUserAnalytics]);

  const formatNumber = (num: string) => {
    const value = parseFloat(num.replace(/,/g, ''));
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Analytics Dashboard</h3>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('protocol')}
          className={`pb-2 px-1 font-medium text-sm ${
            activeTab === 'protocol'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Protocol
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`pb-2 px-1 font-medium text-sm ${
            activeTab === 'tokens'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tokens
        </button>
        {account && (
          <button
            onClick={() => setActiveTab('user')}
            className={`pb-2 px-1 font-medium text-sm ${
              activeTab === 'user'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Portfolio
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Protocol Analytics */}
      {activeTab === 'protocol' && protocolAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-600 mb-1">Total TVL</h4>
              <p className="text-2xl font-bold text-blue-900">
                {formatNumber(protocolAnalytics.totalValueLocked)}
              </p>
              <p className="text-sm text-green-600">+5.2%</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-600 mb-1">24h Volume</h4>
              <p className="text-2xl font-bold text-green-900">
                $125M
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-600 mb-1">Total Users</h4>
              <p className="text-2xl font-bold text-purple-900">
                {protocolAnalytics.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-600 mb-1">Transactions</h4>
              <p className="text-2xl font-bold text-orange-900">
                {(protocolAnalytics.totalTransactions / 1e6).toFixed(1)}M
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Protocols</h4>
            <div className="space-y-3">
              {protocolAnalytics.topTokens.map((token, index) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="font-medium text-gray-900">{token.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Price: ${token.price}
                    </div>
                    <div className="text-xs text-gray-500">
                      Volume: {formatNumber(token.volume24h)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Token Analytics */}
      {activeTab === 'tokens' && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Token Performance</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Token</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Price</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">24h Change</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Volume</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {tokenAnalytics.map((token) => (
                  <tr key={token.symbol} className="border-b border-gray-100">
                    <td className="py-3 px-3">
                      <div>
                        <div className="font-medium text-gray-900">{token.symbol}</div>
                        <div className="text-sm text-gray-500">{token.name}</div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3 font-medium text-gray-900">
                      ${token.price}
                    </td>
                    <td className={`text-right py-3 px-3 font-medium ${
                      token.change24h.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {token.change24h}
                    </td>
                    <td className="text-right py-3 px-3 text-gray-900">
                      {formatNumber(token.volume24h)}
                    </td>
                    <td className="text-right py-3 px-3 text-gray-900">
                      {formatNumber(token.marketCap)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Analytics */}
      {activeTab === 'user' && account && userAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-indigo-600 mb-1">Avg Transaction</h4>
              <p className="text-2xl font-bold text-indigo-900">
                ${userAnalytics.averageTransactionSize}
              </p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-cyan-600 mb-1">Total Volume</h4>
              <p className="text-2xl font-bold text-cyan-900">
                ${userAnalytics.totalVolume}
              </p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-pink-600 mb-1">Transactions</h4>
              <p className="text-2xl font-bold text-pink-900">
                {userAnalytics.totalTransactions}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-600 mb-1">Activity Score</h4>
              <p className="text-2xl font-bold text-yellow-900">
                {userAnalytics.activityScore}/100
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Most Used Tokens</h4>
            <div className="space-y-3">
              {userAnalytics.mostUsedTokens.map((token, index) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="font-medium text-gray-900">{token.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {token.count} transactions
                    </div>
                    <div className="text-xs text-gray-500">
                      ${token.volume}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Risk Level</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                userAnalytics.riskScore < 30 ? 'bg-green-100 text-green-800' :
                userAnalytics.riskScore < 70 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {userAnalytics.riskScore < 30 ? 'Low' : userAnalytics.riskScore < 70 ? 'Medium' : 'High'} Risk
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'user' && !account && (
        <div className="text-center py-8">
          <p className="text-gray-500">Connect your wallet to view portfolio analytics</p>
        </div>
      )}
    </div>
  );
}