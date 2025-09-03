// Hyperion Analytics API Integration
import { FallbackHandler } from './fallback-handler';
import { logger } from './logger';

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
  reputationScore: number;
  behaviorPattern: string;
  lastActivity: number;
}

interface TokenUsage {
  token: string;
  symbol: string;
  count: number;
  volume: string;
  firstUsed: number;
  lastUsed: number;
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
  growthRate: number;
  retentionRate: number;
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
  liquidity: string;
  volatility: number;
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
  complexity: number;
  interactionCount: number;
}

interface DeFiMetrics {
  totalValueLocked: AnalyticsData[];
  borrowingRate: AnalyticsData[];
  liquidationRate: AnalyticsData[];
  collateralRatio: AnalyticsData[];
  activeLoans: AnalyticsData[];
  defaultRate: AnalyticsData[];
  utilizationRate: AnalyticsData[];
  healthFactor: AnalyticsData[];
}

interface ReputationMetrics {
  address: string;
  overallScore: number;
  trustworthiness: number;
  activityLevel: number;
  riskProfile: string;
  badges: string[];
  achievements: Achievement[];
  socialScore: number;
  communityRank: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earnedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface BehaviorAnalysis {
  address: string;
  patterns: BehaviorPattern[];
  anomalies: Anomaly[];
  predictedActions: PredictedAction[];
  riskFactors: string[];
  recommendations: string[];
}

interface BehaviorPattern {
  type: string;
  frequency: number;
  confidence: number;
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
  confidence: number;
}

interface PredictedAction {
  action: string;
  probability: number;
  timeframe: string;
  confidence: number;
}

interface NetworkAnalytics {
  totalNodes: number;
  activeNodes: number;
  networkHealth: number;
  consensusTime: number;
  throughput: number;
  congestionLevel: number;
  feeEstimates: FeeEstimate[];
}

interface FeeEstimate {
  priority: 'low' | 'medium' | 'high';
  gasPrice: string;
  estimatedTime: number;
}

interface CrossChainMetrics {
  totalBridgeVolume: string;
  activeBridges: number;
  averageBridgeTime: number;
  bridgeSuccess: number;
  popularRoutes: BridgeRoute[];
}

interface BridgeRoute {
  fromChain: string;
  toChain: string;
  volume: string;
  count: number;
  averageTime: number;
  successRate: number;
}

class HyperionClient {
  private apiKey: string;
  private baseUrl: string;
  private wsUrl: string;
  private wsConnection: WebSocket | null = null;
  private fallbackHandler: FallbackHandler;

  constructor() {
    this.fallbackHandler = FallbackHandler.getInstance();
    this.apiKey = process.env.NEXT_PUBLIC_HYPERION_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_HYPERION_API_URL || 'https://api.hyperion.xyz';
    this.wsUrl = process.env.NEXT_PUBLIC_HYPERION_WS_URL || 'wss://ws.hyperion.xyz';
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

      const data = await response.json();
      logger.info('HYPERION', 'User analytics fetched successfully', { address });
      return data;
    } catch (error) {
      logger.error('HYPERION', 'Error fetching user analytics', { address, error });
      throw error;
    }
  }

  async getUserAnalyticsWithFallback(address: string): Promise<UserAnalytics> {
    return this.fallbackHandler.withFallback(
      'HYPERION',
      () => this.getUserAnalytics(address),
      () => this.getMockUserAnalytics(address)
    );
  }

  private getMockUserAnalytics(address: string): Promise<UserAnalytics> {
    logger.warn('HYPERION', 'Using mock user analytics data', { address });
    return Promise.resolve({
      address,
      totalTransactions: 0,
      totalVolume: '0',
      averageTransactionSize: '0',
      mostUsedTokens: [],
      activityScore: 0,
      riskScore: 50,
      reputationScore: 0,
      behaviorPattern: 'unknown',
      lastActivity: Date.now()
    });
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
        utilizationRate: [],
        healthFactor: [],
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

  // Reputation and Behavior Analysis Methods
  async getReputationMetrics(address: string): Promise<ReputationMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/reputation/${address}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get reputation metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        address,
        overallScore: 0,
        trustworthiness: 0,
        activityLevel: 0,
        riskProfile: 'unknown',
        badges: [],
        achievements: [],
        socialScore: 0,
        communityRank: 0,
      };
    }
  }

  async calculateReputationScore(address: string, transactions: TransactionAnalytics[]): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/reputation/calculate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ address, transactions }),
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate reputation score: ${response.statusText}`);
      }

      const data = await response.json();
      return data.score || 0;
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return 0;
    }
  }

  async getBehaviorAnalysis(address: string): Promise<BehaviorAnalysis> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/behavior/${address}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get behavior analysis: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        address,
        patterns: [],
        anomalies: [],
        predictedActions: [],
        riskFactors: [],
        recommendations: [],
      };
    }
  }

  async getNetworkAnalytics(): Promise<NetworkAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/network/analytics`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get network analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        totalNodes: 0,
        activeNodes: 0,
        networkHealth: 0,
        consensusTime: 0,
        throughput: 0,
        congestionLevel: 0,
        feeEstimates: [],
      };
    }
  }

  async getCrossChainMetrics(): Promise<CrossChainMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/crosschain/metrics`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get cross-chain metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        totalBridgeVolume: '0',
        activeBridges: 0,
        averageBridgeTime: 0,
        bridgeSuccess: 0,
        popularRoutes: [],
      };
    }
  }

  // Advanced Analytics Methods
  async getAdvancedUserMetrics(address: string, timeframe: string = '30d'): Promise<{
    transactionPatterns: BehaviorPattern[];
    riskAssessment: { score: number; factors: string[] };
    socialMetrics: { connections: number; influence: number; trustScore: number };
    performanceMetrics: { roi: number; winRate: number; avgHoldTime: number };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/advanced/${address}?timeframe=${timeframe}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get advanced user metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        transactionPatterns: [],
        riskAssessment: { score: 0, factors: [] },
        socialMetrics: { connections: 0, influence: 0, trustScore: 0 },
        performanceMetrics: { roi: 0, winRate: 0, avgHoldTime: 0 },
      };
    }
  }

  async getComparativeAnalysis(addresses: string[]): Promise<{
    rankings: { address: string; rank: number; score: number }[];
    metrics: { [key: string]: number }[];
    insights: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/compare`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ addresses }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get comparative analysis: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return {
        rankings: [],
        metrics: [],
        insights: [],
      };
    }
  }

  // WebSocket Methods for Real-time Analytics
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(`${this.wsUrl}?apiKey=${this.apiKey}`);
        
        this.wsConnection.onopen = () => {
          console.log('Hyperion WebSocket connected');
          resolve();
        };
        
        this.wsConnection.onerror = (error) => {
          console.error('Hyperion WebSocket error:', error);
          reject(error);
        };
        
        this.wsConnection.onclose = () => {
          console.log('Hyperion WebSocket disconnected');
          this.wsConnection = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  subscribeToUserAnalytics(address: string, callback: (data: UserAnalytics) => void): void {
    if (!this.wsConnection) {
      throw new Error('WebSocket not connected');
    }
    
    this.wsConnection.send(JSON.stringify({
      type: 'subscribe',
      channel: 'user_analytics',
      address,
    }));
    
    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === 'user_analytics' && data.address === address) {
        callback(data.analytics);
      }
    };
  }

  subscribeToNetworkMetrics(callback: (data: NetworkAnalytics) => void): void {
    if (!this.wsConnection) {
      throw new Error('WebSocket not connected');
    }
    
    this.wsConnection.send(JSON.stringify({
      type: 'subscribe',
      channel: 'network_metrics',
    }));
    
    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === 'network_metrics') {
        callback(data.metrics);
      }
    };
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Utility Methods
  async batchAnalytics(requests: { type: string; params: any }[]): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get batch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return [];
    }
  }

  async exportAnalytics(address: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analytics/export/${address}?format=${format}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to export analytics: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Hyperion API Error:', error);
      return '';
    }
  }
}

export const hyperionClient = new HyperionClient();
export const hyperionAPI = hyperionClient;
export type {
  AnalyticsData,
  UserAnalytics,
  TokenUsage,
  ProtocolAnalytics,
  TokenMetrics,
  TransactionAnalytics,
  DeFiMetrics,
  ReputationMetrics,
  Achievement,
  BehaviorAnalysis,
  BehaviorPattern,
  Anomaly,
  PredictedAction,
  NetworkAnalytics,
  FeeEstimate,
  CrossChainMetrics,
  BridgeRoute,
};