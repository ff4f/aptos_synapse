// Nodit API Integration for Aptos data

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

class NoditAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_NODIT_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_NODIT_API_URL || 'https://aptos-mainnet.nodit.io';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
    };
  }

  async getAccountInfo(address: string): Promise<AptosAccountInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/accounts/${address}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit API Error:', error);
      throw error;
    }
  }

  async getAccountBalance(address: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/accounts/${address}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account balance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.coin?.value || '0';
    } catch (error) {
      console.error('Nodit API Error:', error);
      return '0';
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/accounts/${address}/resources`, {
        headers: this.getHeaders(),
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
          
          // Extract token info from coin type
          const parts = coinType.split('::');
          const symbol = parts[parts.length - 1] || 'Unknown';
          
          tokenBalances.push({
            coin_type: coinType,
            amount,
            decimals: 8, // Default for most Aptos tokens
            name: symbol,
            symbol: symbol.toUpperCase(),
          });
        }
      }

      return tokenBalances;
    } catch (error) {
      console.error('Nodit API Error:', error);
      return [];
    }
  }

  async getAccountTransactions(address: string, limit: number = 10): Promise<AptosTransaction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/accounts/${address}/transactions?limit=${limit}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account transactions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit API Error:', error);
      return [];
    }
  }

  async getTransaction(txHash: string): Promise<AptosTransaction | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/transactions/by_hash/${txHash}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit API Error:', error);
      return null;
    }
  }

  async submitTransaction(signedTransaction: Record<string, unknown>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/transactions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(signedTransaction),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit API Error:', error);
      throw error;
    }
  }

  async getGasEstimate(transaction: Record<string, unknown>): Promise<{ gas_estimate: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/transactions/estimate_gas_price`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error(`Failed to estimate gas: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Nodit API Error:', error);
      return { gas_estimate: '1000' };
    }
  }
}

export const noditAPI = new NoditAPI();
export type { AptosAccountInfo, AptosTransaction, TokenBalance };