import React, { useState, useEffect } from 'react';
import { FallbackHandler } from '../lib/fallback-handler';
import { logger } from '../lib/logger';
import { noditClient } from '../lib/nodit';
import { hyperionClient } from '../lib/hyperion';
import { kanaLabsAPI } from '../lib/kana-labs';
import { tappExchangeAPI } from '../lib/tapp-exchange';

interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: number;
  failureCount: number;
  uptime: number;
}

interface ProviderStatusProps {
  className?: string;
  filter?: 'nodit' | 'hyperion' | 'kana' | 'tapp' | 'all';
}

export const ProviderStatus: React.FC<ProviderStatusProps> = ({ className = '', filter = 'all' }) => {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const checkProviderHealth = async (name: string, healthCheck: () => Promise<any>): Promise<ProviderHealth> => {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'down' = 'down';
    let responseTime = 0;

    try {
      await Promise.race([
        healthCheck(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      responseTime = Date.now() - startTime;
      status = responseTime < 2000 ? 'healthy' : 'degraded';
    } catch (error) {
      responseTime = Date.now() - startTime;
      status = 'down';
      logger.error('NODIT', `Health check failed for ${name}`, { error });
    }

    const fallbackHandler = FallbackHandler.getInstance();
    const health = fallbackHandler.getProviderHealth(name.toUpperCase());

    return {
      name,
      status,
      responseTime,
      lastCheck: Date.now(),
      failureCount: health.failureCount,
      uptime: health.healthy ? 99.9 : Math.max(0, 99.9 - (health.failureCount * 5))
    };
  };

  const updateProviderStatus = async () => {
    setIsLoading(true);
    try {
      const healthChecks = await Promise.allSettled([
        checkProviderHealth('Nodit', () => noditClient.getNetworkStats('aptos')),
        checkProviderHealth('Hyperion', () => hyperionClient.getNetworkAnalytics()),
        checkProviderHealth('Kana Labs', () => kanaLabsAPI.getSupportedChains()),
        checkProviderHealth('Tapp.Exchange', () => tappExchangeAPI.getTokenList())
      ]);

      const providerResults = healthChecks.map((result, index) => {
        const providerNames = ['Nodit', 'Hyperion', 'Kana Labs', 'Tapp.Exchange'];
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: providerNames[index],
            status: 'down' as const,
            responseTime: 5000,
            lastCheck: Date.now(),
            failureCount: 999,
            uptime: 0
          };
        }
      });

      setProviders(providerResults);
      setLastUpdate(Date.now());
    } catch (error) {
      logger.error('NODIT', 'Failed to update provider status', { error });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateProviderStatus();
    const interval = setInterval(updateProviderStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'down': return '❌';
      default: return '❓';
    }
  };

  const formatResponseTime = (time: number) => {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`;
  };

  const getFilteredProviders = () => {
    if (filter === 'all') return providers;
    
    const filterMap = {
      'nodit': 'Nodit',
      'hyperion': 'Hyperion', 
      'kana': 'Kana Labs',
      'tapp': 'Tapp.Exchange'
    };
    
    return providers.filter(provider => provider.name === filterMap[filter]);
  };

  const filteredProviders = getFilteredProviders();

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Provider Status</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
          <button
            onClick={updateProviderStatus}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '🔄' : '↻'} Refresh
          </button>
        </div>
      </div>

      {isLoading && providers.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-700">Checking provider status...</span>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          filter === 'all' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredProviders.map((provider) => (
            <div key={provider.name} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                <span className="text-lg">{getStatusIcon(provider.status)}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(provider.status)}`}>
                    {provider.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Response:</span>
                  <span className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">{formatResponseTime(provider.responseTime)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Uptime:</span>
                  <span className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">{formatUptime(provider.uptime)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Failures:</span>
                  <span className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">{provider.failureCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-700 font-medium">Healthy:</span>
            <span className="ml-2 font-bold text-green-700">
              {filteredProviders.filter(p => p.status === 'healthy').length}
            </span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-700 font-medium">Degraded:</span>
            <span className="ml-2 font-bold text-yellow-700">
              {filteredProviders.filter(p => p.status === 'degraded').length}
            </span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-700 font-medium">Down:</span>
            <span className="ml-2 font-bold text-red-700">
              {filteredProviders.filter(p => p.status === 'down').length}
            </span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-700 font-medium">Avg Response:</span>
            <span className="ml-2 font-bold text-gray-900">
              {filteredProviders.length > 0 ? formatResponseTime(
                filteredProviders.reduce((sum, p) => sum + p.responseTime, 0) / filteredProviders.length
              ) : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderStatus;