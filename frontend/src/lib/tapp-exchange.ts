// Tapp.Exchange API Integration for DEX functionality

interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  fee: string;
  route: SwapRoute[];
  estimatedGas: string;
}

interface SwapRoute {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  fee: string;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  verified: boolean;
}

interface PoolInfo {
  address: string;
  token0: TokenInfo;
  token1: TokenInfo;
  fee: string;
  liquidity: string;
  volume24h: string;
  tvl: string;
  apr: string;
}

interface SwapTransaction {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  timestamp: number;
}

class TappExchangeAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_TAPP_EXCHANGE_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_TAPP_EXCHANGE_API_URL || 'https://api.tapp.exchange';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async getSwapQuote(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    slippage: number = 0.5
  ): Promise<SwapQuote> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/swap/quote`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          inputToken,
          outputToken,
          inputAmount,
          slippage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get swap quote: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      throw error;
    }
  }

  async executeSwap(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    minOutputAmount: string,
    userAddress: string,
    slippage: number = 0.5
  ): Promise<SwapTransaction> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/swap/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          inputToken,
          outputToken,
          inputAmount,
          minOutputAmount,
          userAddress,
          slippage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute swap: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      throw error;
    }
  }

  async getTokenList(): Promise<TokenInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/tokens`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get token list: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return [];
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<{ price: string; change24h: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/tokens/${tokenAddress}/price`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get token price: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return { price: '0', change24h: '0' };
    }
  }

  async getPools(): Promise<PoolInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/pools`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get pools: ${response.statusText}`);
      }

      const data = await response.json();
      return data.pools || [];
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return [];
    }
  }

  async getPoolInfo(poolAddress: string): Promise<PoolInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/pools/${poolAddress}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get pool info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return null;
    }
  }

  async getUserSwapHistory(userAddress: string, limit: number = 10): Promise<SwapTransaction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/users/${userAddress}/swaps?limit=${limit}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get user swap history: ${response.statusText}`);
      }

      const data = await response.json();
      return data.swaps || [];
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return [];
    }
  }

  async getSwapTransaction(txHash: string): Promise<SwapTransaction | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/swaps/${txHash}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get swap transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return null;
    }
  }
}

export const tappExchangeAPI = new TappExchangeAPI();
export type { SwapQuote, SwapRoute, TokenInfo, PoolInfo, SwapTransaction };