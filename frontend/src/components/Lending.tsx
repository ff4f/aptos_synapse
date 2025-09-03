'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { noditClient } from '@/lib/nodit';

interface LendingProps {
  className?: string;
}

interface LendingPool {
  id: string;
  asset: string;
  symbol: string;
  totalSupply: string;
  totalBorrow: string;
  supplyAPY: number;
  borrowAPY: number;
  utilizationRate: number;
  collateralFactor: number;
}

interface UserPosition {
  asset: string;
  supplied: string;
  borrowed: string;
  collateralValue: string;
  borrowLimit: string;
}

export function Lending({ className }: LendingProps) {
  const { account, connected } = useWallet();
  const [pools, setPools] = useState<LendingPool[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [selectedPool, setSelectedPool] = useState<LendingPool | null>(null);
  const [action, setAction] = useState<'supply' | 'borrow' | 'repay' | 'withdraw'>('supply');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUserPositions = useCallback(async () => {
    if (!account) return;
    
    try {
      // Mock user positions
      const mockPositions: UserPosition[] = [
        {
          asset: 'APT',
          supplied: '1,000',
          borrowed: '0',
          collateralValue: '750',
          borrowLimit: '562.5'
        },
        {
          asset: 'USDC',
          supplied: '5,000',
          borrowed: '2,000',
          collateralValue: '4,250',
          borrowLimit: '3,612.5'
        }
      ];
      setUserPositions(mockPositions);
    } catch {
      setError('Failed to load user positions');
    }
  }, [account]);

  useEffect(() => {
    loadPools();
    if (connected && account) {
      loadUserPositions();
    }
  }, [connected, account, loadUserPositions]);

  const loadPools = async () => {
    try {
      // Mock data for lending pools
      const mockPools: LendingPool[] = [
        {
          id: '1',
          asset: 'APT',
          symbol: 'APT',
          totalSupply: '1,250,000',
          totalBorrow: '875,000',
          supplyAPY: 4.2,
          borrowAPY: 6.8,
          utilizationRate: 70,
          collateralFactor: 75
        },
        {
          id: '2',
          asset: 'USDC',
          symbol: 'USDC',
          totalSupply: '5,500,000',
          totalBorrow: '4,125,000',
          supplyAPY: 3.5,
          borrowAPY: 5.2,
          utilizationRate: 75,
          collateralFactor: 85
        },
        {
          id: '3',
          asset: 'WETH',
          symbol: 'WETH',
          totalSupply: '850,000',
          totalBorrow: '595,000',
          supplyAPY: 2.8,
          borrowAPY: 4.5,
          utilizationRate: 70,
          collateralFactor: 80
        },
        {
          id: '4',
          asset: 'WBTC',
          symbol: 'WBTC',
          totalSupply: '125,000',
          totalBorrow: '87,500',
          supplyAPY: 1.9,
          borrowAPY: 3.8,
          utilizationRate: 70,
          collateralFactor: 70
        }
      ];
      setPools(mockPools);
    } catch {
      setError('Failed to load lending pools');
    }
  };



  const handleTransaction = async () => {
    if (!selectedPool || !amount || !account) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Create transaction payload for gas estimation
      const transactionPayload = {
        type: 'entry_function_payload',
        function: `${process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS}::lending::${action}`,
        type_arguments: [],
        arguments: [
          selectedPool.id,
          (parseFloat(amount) * 100000000).toString(), // Convert to smallest unit
        ],
      };

      // Estimate gas using Nodit
      const gasEstimate = await noditClient.getAptosGasEstimate(transactionPayload);
      const maxAcceptableGas = parseInt(process.env.NEXT_PUBLIC_MAX_ACCEPTABLE_GAS || '1000000');
      
      if (parseInt(gasEstimate.gas_estimate) > maxAcceptableGas) {
        setError(`Gas fee too high (${gasEstimate.gas_estimate}). Please try again later.`);
        return;
      }

      // Show gas estimate to user
      const confirmTransaction = window.confirm(
        `Estimated gas: ${gasEstimate.gas_estimate} units\n` +
        `Action: ${action.charAt(0).toUpperCase() + action.slice(1)} ${amount} ${selectedPool.symbol}\n` +
        `Continue with transaction?`
      );

      if (!confirmTransaction) {
        return;
      }
      
      // Mock transaction - in real implementation, this would interact with smart contracts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh data after transaction
      await loadPools();
      await loadUserPositions();
      
      setAmount('');
      setSelectedPool(null);
    } catch (error: any) {
      console.error('Transaction failed:', error);
      if (error.message.includes('Gas fee too high')) {
        setError(error.message);
      } else {
        setError(`Failed to ${action} ${selectedPool.symbol}: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getTotalSupplied = () => {
    return userPositions.reduce((total, pos) => {
      return total + parseFloat(pos.collateralValue.replace(/,/g, ''));
    }, 0);
  };

  const getTotalBorrowed = () => {
    return userPositions.reduce((total, pos) => {
      const borrowed = parseFloat(pos.borrowed.replace(/,/g, ''));
      // Assuming 1:1 USD value for simplicity
      return total + borrowed;
    }, 0);
  };

  const getBorrowLimit = () => {
    return userPositions.reduce((total, pos) => {
      return total + parseFloat(pos.borrowLimit.replace(/,/g, ''));
    }, 0);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Lending & Borrowing</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setAction('supply')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              action === 'supply'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Supply
          </button>
          <button
            onClick={() => setAction('borrow')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              action === 'borrow'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Borrow
          </button>
        </div>
      </div>

      {connected && account && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Supplied</div>
            <div className="text-2xl font-bold text-green-700">
              ${getTotalSupplied().toLocaleString()}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Total Borrowed</div>
            <div className="text-2xl font-bold text-red-700">
              ${getTotalBorrowed().toLocaleString()}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Borrow Limit</div>
            <div className="text-2xl font-bold text-blue-700">
              ${getBorrowLimit().toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Supply
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supply APY
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Borrow
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Borrow APY
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pools.map((pool) => (
              <tr key={pool.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {pool.symbol.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{pool.symbol}</div>
                      <div className="text-sm text-gray-500">{pool.asset}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pool.totalSupply}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  {pool.supplyAPY}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pool.totalBorrow}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                  {pool.borrowAPY}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${pool.utilizationRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{pool.utilizationRate}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedPool(pool)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {action === 'supply' ? 'Supply' : 'Borrow'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Modal */}
      {selectedPool && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {action.charAt(0).toUpperCase() + action.slice(1)} {selectedPool.symbol}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${selectedPool.symbol} amount`}
                />
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>APY:</span>
                  <span className={action === 'supply' ? 'text-green-600' : 'text-red-600'}>
                    {action === 'supply' ? selectedPool.supplyAPY : selectedPool.borrowAPY}%
                  </span>
                </div>
                {action === 'borrow' && (
                  <div className="flex justify-between text-sm mt-1">
                    <span>Collateral Factor:</span>
                    <span>{selectedPool.collateralFactor}%</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleTransaction}
                  disabled={loading || !amount || !connected}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : `${action.charAt(0).toUpperCase() + action.slice(1)}`}
                </button>
                <button
                  onClick={() => {
                    setSelectedPool(null);
                    setAmount('');
                    setError('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!connected && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Connect your wallet to start lending and borrowing</p>
        </div>
      )}
    </div>
  );
}