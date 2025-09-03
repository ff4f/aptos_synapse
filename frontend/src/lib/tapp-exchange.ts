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

interface LiquidityPosition {
  id: string;
  pool: PoolInfo;
  token0Amount: string;
  token1Amount: string;
  liquidity: string;
  uncollectedFees0: string;
  uncollectedFees1: string;
  apr: string;
}

interface MarketData {
  token: TokenInfo;
  price: string;
  priceChange24h: string;
  volume24h: string;
  marketCap: string;
  totalSupply: string;
}

interface SwapSettings {
  slippage: number;
  deadline: number;
  gasPrice?: string;
  maxGasLimit?: string;
}

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
}

interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: string;
}

class TappClient {
  private apiKey: string;
  private baseUrl: string;
  private wsUrl: string;
  private ws?: WebSocket;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_TAPP_EXCHANGE_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_TAPP_EXCHANGE_API_URL || 'https://api.tapp.exchange';
    this.wsUrl = process.env.NEXT_PUBLIC_TAPP_EXCHANGE_WS_URL || 'wss://ws.tapp.exchange';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  // Basic Swap Functions
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
    settings: SwapSettings = { slippage: 0.5, deadline: 20 }
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
          ...settings,
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

  async getBestRoute(
    inputToken: string,
    outputToken: string,
    inputAmount: string
  ): Promise<SwapRoute[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/swap/route`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          inputToken,
          outputToken,
          inputAmount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get best route: ${response.statusText}`);
      }

      const data = await response.json();
      return data.route || [];
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return [];
    }
  }

  // Token and Market Data
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

  async getMarketData(tokenAddress: string): Promise<MarketData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/tokens/${tokenAddress}/market`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get market data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return null;
    }
  }

  async getTopTokens(limit: number = 50): Promise<MarketData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/tokens/top?limit=${limit}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get top tokens: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return [];
    }
  }

  // Pool and Liquidity Functions
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

  async addLiquidity(
    token0: string,
    token1: string,
    amount0: string,
    amount1: string,
    userAddress: string,
    fee: string = '0.3'
  ): Promise<{ hash: string; positionId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/liquidity/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          token0,
          token1,
          amount0,
          amount1,
          userAddress,
          fee,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add liquidity: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      throw error;
    }
  }

  async removeLiquidity(
    positionId: string,
    liquidity: string,
    userAddress: string
  ): Promise<{ hash: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/liquidity/remove`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          positionId,
          liquidity,
          userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove liquidity: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      throw error;
    }
  }

  async getUserLiquidityPositions(userAddress: string): Promise<LiquidityPosition[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/users/${userAddress}/positions`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get user positions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.positions || [];
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return [];
    }
  }

  // Transaction History
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

  // Advanced Features
  async getOrderBook(token0: string, token1: string): Promise<OrderBook> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/orderbook/${token0}/${token1}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get order book: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return {
        bids: [],
        asks: [],
        spread: '0',
      };
    }
  }

  async getPoolAnalytics(poolAddress: string, timeframe: '1h' | '24h' | '7d' | '30d' = '24h') {
    try {
      const response = await fetch(`${this.baseUrl}/v1/pools/${poolAddress}/analytics?timeframe=${timeframe}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get pool analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return null;
    }
  }

  async estimateSwapGas(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    userAddress: string
  ): Promise<{ gasEstimate: string; gasCost: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/swap/gas-estimate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          inputToken,
          outputToken,
          inputAmount,
          userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to estimate gas: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      return {
        gasEstimate: '200000',
        gasCost: '0.01',
      };
    }
  }

  // WebSocket Functions
  connectWebSocket(onMessage: (data: any) => void, onError?: (error: Event) => void) {
    try {
      this.ws = new WebSocket(`${this.wsUrl}?token=${this.apiKey}`);
      
      this.ws.onopen = () => {
        console.log('Tapp.Exchange WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Tapp.Exchange WebSocket error:', error);
        if (onError) onError(error);
      };
      
      this.ws.onclose = () => {
        console.log('Tapp.Exchange WebSocket disconnected');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  subscribeToPrice(tokenAddress: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'price',
        token: tokenAddress,
      }));
    }
  }

  subscribeToOrderBook(token0: string, token1: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'orderbook',
        pair: `${token0}/${token1}`,
      }));
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  // Utility Functions
  calculatePriceImpact(inputAmount: string, outputAmount: string, marketPrice: string): string {
    try {
      const input = parseFloat(inputAmount);
      const output = parseFloat(outputAmount);
      const market = parseFloat(marketPrice);
      
      const expectedOutput = input * market;
      const impact = ((expectedOutput - output) / expectedOutput) * 100;
      
      return Math.abs(impact).toFixed(2);
    } catch (error) {
      return '0';
    }
  }

  formatTokenAmount(amount: string, decimals: number): string {
    try {
      const num = parseFloat(amount) / Math.pow(10, decimals);
      return num.toFixed(6);
    } catch (error) {
      return '0';
    }
  }

  parseTokenAmount(amount: string, decimals: number): string {
    try {
      const num = parseFloat(amount) * Math.pow(10, decimals);
      return Math.floor(num).toString();
    } catch (error) {
      return '0';
    }
  }
}

export const tappClient = new TappClient();
export type {
  SwapQuote,
  SwapRoute,
  TokenInfo,
  PoolInfo,
  SwapTransaction,
  LiquidityPosition,
  MarketData,
  SwapSettings,
  OrderBook,
  OrderBookEntry,
};

// Legacy export for backward compatibility
export const tappExchangeAPI = tappClient;