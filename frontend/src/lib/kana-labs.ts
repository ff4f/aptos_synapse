// Kana Labs Bridge Integration

interface BridgeQuote {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedOutput: string;
  fee: string;
  estimatedTime: number;
}

interface BridgeTransaction {
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  fromChain: string;
  toChain: string;
  amount: string;
  timestamp: number;
}

class KanaLabsAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_KANA_LABS_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_KANA_LABS_API_URL || 'https://api.kanalabs.io';
  }

  async getBridgeQuote(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<BridgeQuote> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/bridge/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          fromChain,
          toChain,
          fromToken,
          toToken,
          amount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get bridge quote: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kana Labs API Error:', error);
      throw error;
    }
  }

  async initiateBridge(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    recipientAddress: string
  ): Promise<BridgeTransaction> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/bridge/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          fromChain,
          toChain,
          fromToken,
          toToken,
          amount,
          recipientAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate bridge: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kana Labs API Error:', error);
      throw error;
    }
  }

  async getBridgeStatus(txHash: string): Promise<BridgeTransaction> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/bridge/status/${txHash}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get bridge status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kana Labs API Error:', error);
      throw error;
    }
  }

  async getSupportedChains(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/bridge/chains`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get supported chains: ${response.statusText}`);
      }

      const data = await response.json();
      return data.chains || [];
    } catch (error) {
      console.error('Kana Labs API Error:', error);
      return [];
    }
  }

  async getSupportedTokens(chain: string): Promise<Record<string, unknown>[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/bridge/tokens/${chain}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get supported tokens: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Kana Labs API Error:', error);
      return [];
    }
  }
}

export const kanaLabsAPI = new KanaLabsAPI();
export type { BridgeQuote, BridgeTransaction };