// Nodit API Integration for Aptos and Ethereum data

interface AptosAccountInfo {
  address: string;
  balance: string;
  sequence_number: string;
  authentication_key: string;
}

interface AptosTransaction {
  hash: string;
  sender: string;
  sequence_number: string;
  max_gas_amount: string;
  gas_unit_price: string;
  gas_used: string;
  success: boolean;
  timestamp: string;
  type: string;
}

interface TokenBalance {
  coin_type: string;
  amount: string;
  decimals: number;
  name: string;
  symbol: string;
}

interface EthereumBalance {
  address: string;
  balance: string;
  balanceInEth: string;
}

interface EthereumTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed?: string;
  status: string;
  blockNumber: string;
  timestamp: string;
}

interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

interface NetworkStats {
  blockHeight: string;
  totalTransactions: string;
  avgBlockTime: string;
  networkHashRate?: string;
}

class NoditClient {
  private aptosApiKey: string;
  private ethApiKey: string;
  private aptosBaseUrl: string;
  private ethBaseUrl: string;

  constructor() {
    this.aptosApiKey = process.env.NEXT_PUBLIC_NODIT_APTOS_API_KEY || '';
    this.ethApiKey = process.env.NEXT_PUBLIC_NODIT_ETH_API_KEY || '';
    this.aptosBaseUrl = process.env.NEXT_PUBLIC_NODIT_APTOS_URL || 'https://aptos-mainnet.nodit.io';
    this.ethBaseUrl = process.env.NEXT_PUBLIC_NODIT_ETH_URL || 'https://eth-mainnet.nodit.io';
  }

  private getAptosHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.aptosApiKey,
    };
  }

  private getEthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.ethApiKey}`,
    };
  }

  // Aptos Methods
  async getAptosAccountInfo(address: string): Promise<AptosAccountInfo> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/accounts/${address}`, {
        headers: this.getAptosHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      throw error;
    }
  }

  async getAptosBalance(address: string): Promise<string> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/accounts/${address}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`, {
        headers: this.getAptosHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account balance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.coin?.value || '0';
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      return '0';
    }
  }

  async getAptosTokenBalances(address: string): Promise<TokenBalance[]> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/accounts/${address}/resources`, {
        headers: this.getAptosHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get token balances: ${response.statusText}`);
      }

      const resources = await response.json();
      const tokenBalances: TokenBalance[] = [];

      for (const resource of resources) {
        if (resource.type.includes('::coin::CoinStore<')) {
          const coinType = resource.type.match(/<(.+)>/)?.[1] || '';
          const amount = resource.data?.coin?.value || '0';
          
          const parts = coinType.split('::');
          const symbol = parts[parts.length - 1] || 'Unknown';
          
          tokenBalances.push({
            coin_type: coinType,
            amount,
            decimals: 8,
            name: symbol,
            symbol: symbol.toUpperCase(),
          });
        }
      }

      return tokenBalances;
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      return [];
    }
  }

  async getAptosTransactions(address: string, limit: number = 10): Promise<AptosTransaction[]> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/accounts/${address}/transactions?limit=${limit}`, {
        headers: this.getAptosHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account transactions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      return [];
    }
  }

  async getAptosTransaction(txHash: string): Promise<AptosTransaction | null> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/transactions/by_hash/${txHash}`, {
        headers: this.getAptosHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      return null;
    }
  }

  async submitAptosTransaction(signedTransaction: Record<string, unknown>): Promise<string> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/transactions`, {
        method: 'POST',
        headers: this.getAptosHeaders(),
        body: JSON.stringify(signedTransaction),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      throw error;
    }
  }

  async getAptosGasEstimate(transaction: Record<string, unknown>): Promise<{ gas_estimate: string }> {
    try {
      const response = await fetch(`${this.aptosBaseUrl}/v1/transactions/estimate_gas_price`, {
        method: 'POST',
        headers: this.getAptosHeaders(),
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error(`Failed to estimate gas: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit Aptos API Error:', error);
      return { gas_estimate: '1000' };
    }
  }

  // Ethereum Methods
  async getEthereumBalance(address: string): Promise<EthereumBalance> {
    try {
      const response = await fetch(`${this.ethBaseUrl}/v1/eth/getBalance`, {
        method: 'POST',
        headers: this.getEthHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get Ethereum balance: ${response.statusText}`);
      }

      const data = await response.json();
      const balanceWei = data.result || '0x0';
      const balanceInEth = (parseInt(balanceWei, 16) / 1e18).toString();

      return {
        address,
        balance: balanceWei,
        balanceInEth,
      };
    } catch (error) {
      console.error('Nodit Ethereum API Error:', error);
      return {
        address,
        balance: '0x0',
        balanceInEth: '0',
      };
    }
  }

  async getEthereumTransaction(txHash: string): Promise<EthereumTransaction | null> {
    try {
      const response = await fetch(`${this.ethBaseUrl}/v1/eth/getTransactionByHash`, {
        method: 'POST',
        headers: this.getEthHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get Ethereum transaction: ${response.statusText}`);
      }

      const data = await response.json();
      const tx = data.result;

      if (!tx) return null;

      // Get transaction receipt for status and gas used
      const receiptResponse = await fetch(`${this.ethBaseUrl}/v1/eth/getTransactionReceipt`, {
        method: 'POST',
        headers: this.getEthHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      });

      const receiptData = await receiptResponse.json();
      const receipt = receiptData.result;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value,
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        gasUsed: receipt?.gasUsed || '0',
        status: receipt?.status === '0x1' ? 'success' : 'failed',
        blockNumber: tx.blockNumber,
        timestamp: new Date().toISOString(), // Would need block data for actual timestamp
      };
    } catch (error) {
      console.error('Nodit Ethereum API Error:', error);
      return null;
    }
  }

  async getEthereumGasEstimate(to: string, data?: string, value?: string): Promise<GasEstimate> {
    try {
      // Get gas limit estimate
      const gasResponse = await fetch(`${this.ethBaseUrl}/v1/eth/estimateGas`, {
        method: 'POST',
        headers: this.getEthHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_estimateGas',
          params: [{
            to,
            data: data || '0x',
            value: value || '0x0',
          }],
          id: 1,
        }),
      });

      // Get current gas price
      const priceResponse = await fetch(`${this.ethBaseUrl}/v1/eth/gasPrice`, {
        method: 'POST',
        headers: this.getEthHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1,
        }),
      });

      const gasData = await gasResponse.json();
      const priceData = await priceResponse.json();

      return {
        gasLimit: gasData.result || '0x5208',
        gasPrice: priceData.result || '0x0',
      };
    } catch (error) {
      console.error('Nodit Ethereum Gas Estimate Error:', error);
      return {
        gasLimit: '0x5208', // 21000 gas for simple transfer
        gasPrice: '0x0',
      };
    }
  }

  async getNetworkStats(network: 'aptos' | 'ethereum'): Promise<NetworkStats> {
    try {
      if (network === 'aptos') {
        const response = await fetch(`${this.aptosBaseUrl}/v1/`, {
          headers: this.getAptosHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to get Aptos network stats: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          blockHeight: data.block_height || '0',
          totalTransactions: data.ledger_version || '0',
          avgBlockTime: '1', // Aptos ~1 second block time
        };
      } else {
        const response = await fetch(`${this.ethBaseUrl}/v1/eth/blockNumber`, {
          method: 'POST',
          headers: this.getEthHeaders(),
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get Ethereum network stats: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          blockHeight: data.result || '0x0',
          totalTransactions: '0', // Would need additional API calls
          avgBlockTime: '12', // Ethereum ~12 second block time
        };
      }
    } catch (error) {
      console.error('Nodit Network Stats Error:', error);
      return {
        blockHeight: '0',
        totalTransactions: '0',
        avgBlockTime: '0',
      };
    }
  }

  // Utility Methods
  async isTransactionConfirmed(txHash: string, network: 'aptos' | 'ethereum'): Promise<boolean> {
    try {
      if (network === 'aptos') {
        const tx = await this.getAptosTransaction(txHash);
        return tx !== null && tx.success;
      } else {
        const tx = await this.getEthereumTransaction(txHash);
        return tx !== null && tx.status === 'success';
      }
    } catch (error) {
      console.error('Transaction confirmation check error:', error);
      return false;
    }
  }

  async waitForTransactionConfirmation(
    txHash: string,
    network: 'aptos' | 'ethereum',
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const confirmed = await this.isTransactionConfirmed(txHash, network);
      if (confirmed) return true;
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  }
}

export const noditClient = new NoditClient();
export type {
  AptosAccountInfo,
  AptosTransaction,
  TokenBalance,
  EthereumBalance,
  EthereumTransaction,
  GasEstimate,
  NetworkStats,
};

// Legacy export for backward compatibility
export const noditAPI = noditClient;