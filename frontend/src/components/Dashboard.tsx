'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAccount } from 'wagmi';
import { KanaBridge } from './KanaBridge';
import { Swap } from './Swap';
import { Lending } from './Lending';
import { Analytics } from './Analytics';

interface ProtocolMetrics {
  totalValueLocked: string;
  totalBorrowed: string;
  totalUsers: number;
  bridgeVolume24h: string;
  swapVolume24h: string;
  averageAPY: string;
}

interface UserStats {
  totalDeposited: string;
  totalBorrowed: string;
  healthFactor: string;
  reputationScore: number;
  reputationLevel: string;
  bridgeTransactions: number;
  swapTransactions: number;
}

export function Dashboard() {
  const { account: aptosAccount, connected: aptosConnected } = useWallet();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'bridge' | 'swap' | 'lending' | 'analytics'>('overview');
  const [protocolMetrics, setProtocolMetrics] = useState<ProtocolMetrics>({
    totalValueLocked: '0',
    totalBorrowed: '0',
    totalUsers: 0,
    bridgeVolume24h: '0',
    swapVolume24h: '0',
    averageAPY: '0',
  });
  const [userStats, setUserStats] = useState<UserStats>({
    totalDeposited: '0',
    totalBorrowed: '0',
    healthFactor: '0',
    reputationScore: 0,
    reputationLevel: 'Bronze',
    bridgeTransactions: 0,
    swapTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProtocolMetrics();
    if (aptosConnected || evmConnected) {
      loadUserStats();
    }
  }, [aptosConnected, evmConnected, aptosAccount, evmAddress]);

  const loadProtocolMetrics = async () => {
    try {
      // Mock data for demo - in real app, fetch from smart contracts
      setProtocolMetrics({
        totalValueLocked: '12,450,000',
        totalBorrowed: '8,320,000',
        totalUsers: 15420,
        bridgeVolume24h: '2,180,000',
        swapVolume24h: '1,890,000',
        averageAPY: '8.5',
      });
    } catch (error) {
      console.error('Failed to load protocol metrics:', error);
    }
  };

  const loadUserStats = async () => {
    if (!aptosAccount && !evmAddress) return;
    
    setLoading(true);
    try {
      // Mock data for demo - in real app, fetch from smart contracts
      setUserStats({
        totalDeposited: '25,000',
        totalBorrowed: '15,000',
        healthFactor: '1.67',
        reputationScore: 750,
        reputationLevel: 'Gold',
        bridgeTransactions: 12,
        swapTransactions: 28,
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toLocaleString()}`;
  };

  const getHealthFactorColor = (factor: string): string => {
    const value = parseFloat(factor);
    if (value >= 2) return 'text-green-600';
    if (value >= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReputationColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'platinum': return 'text-purple-600 bg-purple-100';
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      default: return 'text-orange-600 bg-orange-100';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'bridge', name: 'Bridge', icon: '🌉' },
    { id: 'swap', name: 'Swap', icon: '🔄' },
    { id: 'lending', name: 'Lending', icon: '💰' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Tab Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Protocol Metrics */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Protocol Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Value Locked</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(protocolMetrics.totalValueLocked)}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Borrowed</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(protocolMetrics.totalBorrowed)}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{protocolMetrics.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Bridge Volume (24h)</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(protocolMetrics.bridgeVolume24h)}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Swap Volume (24h)</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(protocolMetrics.swapVolume24h)}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average APY</p>
                      <p className="text-2xl font-bold text-gray-900">{protocolMetrics.averageAPY}%</p>
                    </div>
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Stats */}
            {(aptosConnected || evmConnected) && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Portfolio</h2>
                {loading ? (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Deposited</h3>
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(userStats.totalDeposited)}</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Borrowed</h3>
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(userStats.totalBorrowed)}</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Health Factor</h3>
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${getHealthFactorColor(userStats.healthFactor)}`}>
                        {userStats.healthFactor}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Reputation</h3>
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-gray-900">{userStats.reputationScore}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReputationColor(userStats.reputationLevel)}`}>
                          {userStats.reputationLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                  onClick={() => setActiveTab('bridge')}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🌉</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bridge Assets</h3>
                  <p className="text-gray-600 text-sm">Transfer assets across chains</p>
                </button>

                <button
                  onClick={() => setActiveTab('swap')}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Swap Tokens</h3>
                  <p className="text-gray-600 text-sm">Exchange tokens at best rates</p>
                </button>

                <button
                  onClick={() => setActiveTab('lending')}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Lend & Borrow</h3>
                  <p className="text-gray-600 text-sm">Earn yield or get liquidity</p>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">View Analytics</h3>
                  <p className="text-gray-600 text-sm">Track your performance</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bridge' && <KanaBridge />}
        {activeTab === 'swap' && <Swap />}
        {activeTab === 'lending' && <Lending />}
        {activeTab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}