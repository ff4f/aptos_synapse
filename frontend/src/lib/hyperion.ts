// Hyperion Analytics API Integration

interface AnalyticsData {
  timestamp: number;
  value: number;
  change: number;
}

interface UserAnalytics {
  address: string;
  totalTransactions: number;
  totalVolume: string;
  averageTransactionSize: string;
  mostUsedTokens: TokenUsage[];
  activityScore: number;
  riskScore: number;
}

interface TokenUsage {
  token: string;
  symbol: string;
  count: number;
  volume: string;
}

interface ProtocolAnalytics {
  totalValueLocked: string;
  totalUsers: number;
  totalTransactions: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageTransactionValue: string;
  topTokens: TokenMetrics[];
}

interface TokenMetrics {
  address: string;
  symbol: string;
  name: string;
  price: string;
  marketCap: string;
  volume24h: string;
  change24h: string;
  holders: number;
}

interface TransactionAnalytics {
  hash: string;
  type: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  success: boolean;
  timestamp: number;
  riskScore: number;
  tags: string[];
}

interface DeFiMetrics {
  totalValueLocked: AnalyticsData[];
  borrowingRate: AnalyticsData[];
  liquidationRate: AnalyticsData[];
  collateralRatio: AnalyticsData[];
  activeLoans: AnalyticsData[];
  defaultRate: AnalyticsData[];
}

class HyperionAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_HYPERION_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_HYPERION_API_URL || 'https://api.hyperion.xyz';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  async getUserAnalytics(address: string): Promise<UserAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/users/${address}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get user analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      throw error;
    }
  }

  async getProtocolAnalytics(): Promise<ProtocolAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/protocol`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get protocol analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      throw error;
    }
  }

  async getTokenMetrics(tokenAddress: string): Promise<TokenMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/tokens/${tokenAddress}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get token metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      throw error;
    }
  }

  async getTransactionAnalytics(
    address: string,
    startDate: string,
    endDate: string
  ): Promise<TransactionAnalytics[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/analytics/transactions/${address}?start=${startDate}&end=${endDate}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get transaction analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return [];
    }
  }

  async getDeFiMetrics(timeframe: '1d' | '7d' | '30d' | '90d' = '7d'): Promise<DeFiMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/defi?timeframe=${timeframe}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get DeFi metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        totalValueLocked: [],
        borrowingRate: [],
        liquidationRate: [],
        collateralRatio: [],
        activeLoans: [],
        defaultRate: [],
      };
    }
  }

  async getRiskAssessment(address: string): Promise<{ riskScore: number; factors: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/risk/${address}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get risk assessment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return { riskScore: 0, factors: [] };
    }
  }

  async getMarketTrends(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<AnalyticsData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/trends?timeframe=${timeframe}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get market trends: ${response.statusText}`);
      }

      const data = await response.json();
      return data.trends || [];
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return [];
    }
  }

  async getTopTokens(limit: number = 10): Promise<TokenMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/tokens/top?limit=${limit}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get top tokens: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return [];
    }
  }

  async getPortfolioAnalytics(address: string): Promise<{
    totalValue: string;
    allocation: { token: string; percentage: number; value: string }[];
    performance: AnalyticsData[];
    riskMetrics: { volatility: number; sharpeRatio: number; maxDrawdown: number };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/portfolio/${address}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get portfolio analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        totalValue: '0',
        allocation: [],
        performance: [],
        riskMetrics: { volatility: 0, sharpeRatio: 0, maxDrawdown: 0 },
      };
    }
  }
}

export const hyperionAPI = new HyperionAPI();
export type {
  AnalyticsData,
  UserAnalytics,
  TokenUsage,
  ProtocolAnalytics,
  TokenMetrics,
  TransactionAnalytics,
  DeFiMetrics,
};