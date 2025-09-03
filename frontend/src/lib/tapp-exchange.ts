// Tapp.Exchange API Integration for DEX functionality using JSON-RPC

interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  minAmountOut: string;
  priceImpact: number;
  route: any[];
  unsignedPayload: any; // The payload that needs to be signed
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

interface SwapParams {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  slippage?: number;
  deadline?: number;
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
  private baseURL: string;
  private ws?: WebSocket;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.baseURL = network === 'testnet' 
      ? 'https://testnet.api.tapp.exchange/api/v1' 
      : 'https://api.tapp.exchange/api/v1';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  // Basic Swap Functions
  /**
   * Get swap quote with unsigned payload using JSON-RPC
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'public/swap_quote',
          params: {
            fromToken: params.fromToken,
            toToken: params.toToken,
            fromAmount: params.fromAmount,
            slippage: params.slippage || 0.5,
            deadline: params.deadline || Math.floor(Date.now() / 1000) + 600, // 10 minutes default
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Tapp.Exchange API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Tapp.Exchange error: ${data.error.message}`);
      }
      
      return data.result;
    } catch (error) {
      console.error('Tapp.Exchange API Error:', error);
      throw error;
    }
  }

  /**
   * Submit signed transaction to Tapp.Exchange
   */
  async submitSignedTransaction(signedTxHash: string): Promise<string> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'public/sc_submit',
          params: {
            hash: signedTxHash
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Tapp.Exchange submit error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Tapp.Exchange error: ${data.error.message}`);
      }
      
      return data.result.transactionHash;
    } catch (error) {
      console.error('Tapp.Exchange submit error:', error);
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
      const response = await fetch(`${this.baseURL}/v1/swap/execute`, {
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
      const response = await fetch(`${this.baseURL}/v1/swap/route`, {
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
  /**
   * Get token list using JSON-RPC
   * Method: public/token (from Tapp Exchange documentation)
   */
  async getTokenList(page: number = 1, pageSize: number = 100): Promise<TokenInfo[]> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'public/token',
          params: {
            page,
            pageSize
          }
        })
      });

      if (!response.ok) {
        console.warn(`Tapp.Exchange API not available: ${response.statusText}. Using fallback tokens.`);
        return this.getFallbackTokens();
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Tapp.Exchange error: ${data.error.message}. Using fallback tokens.`);
        return this.getFallbackTokens();
      }
      
      const tokens = data.result?.tokens || [];
      
      // If API returns empty array, use fallback
      if (tokens.length === 0) {
        console.warn('Tapp.Exchange returned empty token list. Using fallback tokens.');
        return this.getFallbackTokens();
      }
      
      return tokens;
    } catch (error) {
      console.warn('Tapp.Exchange API Error:', error, '. Using fallback tokens.');
      return this.getFallbackTokens();
    }
  }

  private getFallbackTokens(): TokenInfo[] {
    return [
      { 
        symbol: 'APT', 
        name: 'Aptos', 
        address: '0x1::aptos_coin::AptosCoin', 
        decimals: 8, 
        verified: true,
        logoURI: 'https://raw.githubusercontent.com/PancakeSwap/pancake-frontend/develop/public/images/tokens/0x1.png'
      },
      { 
        symbol: 'USDC', 
        name: 'USD Coin', 
        address: '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T', 
        decimals: 6, 
        verified: true,
        logoURI: 'https://raw.githubusercontent.com/PancakeSwap/pancake-frontend/develop/public/images/tokens/usdc.png'
      },
      { 
        symbol: 'USDT', 
        name: 'Tether USD', 
        address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T', 
        decimals: 6, 
        verified: true,
        logoURI: 'https://raw.githubusercontent.com/PancakeSwap/pancake-frontend/develop/public/images/tokens/usdt.png'
      },
      { 
        symbol: 'WETH', 
        name: 'Wrapped Ethereum', 
        address: '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T', 
        decimals: 8, 
        verified: true,
        logoURI: 'https://raw.githubusercontent.com/PancakeSwap/pancake-frontend/develop/public/images/tokens/weth.png'
      },
      { 
        symbol: 'BTC', 
        name: 'Bitcoin', 
        address: '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T', 
        decimals: 8, 
        verified: true,
        logoURI: 'https://raw.githubusercontent.com/PancakeSwap/pancake-frontend/develop/public/images/tokens/btc.png'
      },
      { 
        symbol: 'SOL', 
        name: 'Solana', 
        address: '0xdd89c0e695df0692205912fb69fc290418bed0dbe6e4573d744a6d5e6bab6c13::coin::T', 
        decimals: 8, 
        verified: true,
        logoURI: 'https://raw.githubusercontent.com/PancakeSwap/pancake-frontend/develop/public/images/tokens/sol.png'
      }
    ];
  }

  async getTokenPrice(tokenAddress: string): Promise<{ price: string; change24h: string }> {
    try {
      const response = await fetch(`${this.baseURL}/v1/tokens/${tokenAddress}/price`, {
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
      const response = await fetch(`${this.baseURL}/v1/tokens/${tokenAddress}`, {
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
      const response = await fetch(`${this.baseURL}/v1/tokens/top?limit=${limit}`, {
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
      const response = await fetch(`${this.baseURL}/v1/pools`, {
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

  /**
   * Get pool information using JSON-RPC
   * Method: public/pool_info (from Tapp Exchange documentation)
   */
  async getPoolInfo(poolAddress: string): Promise<PoolInfo | null> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'public/pool_info',
          params: {
            poolAddress
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`API error: ${data.error.message}`);
      }
      
      return data.result;
    } catch (error) {
      console.error('Error fetching pool info:', error);
      throw error;
    }
  }

  async getPoolInfoOld(poolAddress: string): Promise<PoolInfo | null> {
    try {
      const response = await fetch(`${this.baseURL}/v1/pools/${poolAddress}`, {
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
      const response = await fetch(`${this.baseURL}/v1/liquidity/add`, {
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
      const response = await fetch(`${this.baseURL}/v1/liquidity/remove`, {
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
      const response = await fetch(`${this.baseURL}/v1/users/${userAddress}/positions`, {
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
      const response = await fetch(`${this.baseURL}/v1/users/${userAddress}/swaps?limit=${limit}`, {
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
      const response = await fetch(`${this.baseURL}/v1/swaps/${txHash}`, {
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
      const response = await fetch(`${this.baseURL}/v1/orderbook/${token0}/${token1}`, {
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
      const response = await fetch(`${this.baseURL}/v1/pools/${poolAddress}/analytics?timeframe=${timeframe}`, {
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
      const response = await fetch(`${this.baseURL}/v1/swap/gas-estimate`, {
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
      this.ws = new WebSocket('wss://ws.tapp.exchange');
      
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

// Export TappClient class for custom instantiation
export { TappClient };
export default TappClient;

// Create a default instance for easy use
export const tappClient = new TappClient('testnet');
export const tappExchangeAPI = tappClient;

// Export types
export type {
  SwapQuote,
  SwapRoute,
  SwapParams,
  TokenInfo,
  PoolInfo,
  SwapTransaction,
  LiquidityPosition,
  MarketData,
  SwapSettings,
  OrderBook,
  OrderBookEntry,
};