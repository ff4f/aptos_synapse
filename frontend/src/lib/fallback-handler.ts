/**
 * Comprehensive fallback handler for all sponsor integrations
 */

export class FallbackHandler {
  private static instance: FallbackHandler;
  private fallbackHistory: Map<string, { lastFailure: number; failureCount: number }> = new Map();

  private constructor() {}

  static getInstance(): FallbackHandler {
    if (!FallbackHandler.instance) {
      FallbackHandler.instance = new FallbackHandler();
    }
    return FallbackHandler.instance;
  }

  async withFallback<T>(
    provider: string,
    primaryCall: () => Promise<T>,
    fallbackCall: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    try {
      // Implement timeout for primary call
      const primaryPromise = primaryCall();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`${provider} timeout`)), timeoutMs)
      );

      const result = await Promise.race([primaryPromise, timeoutPromise]);
      this.recordSuccess(provider);
      return result;
    } catch (error) {
      console.warn(`${provider} primary call failed, trying fallback:`, error);
      this.recordFailure(provider);
      
      try {
        const fallbackResult = await fallbackCall();
        return fallbackResult;
      } catch (fallbackError) {
        console.error(`${provider} fallback also failed:`, fallbackError);
        throw new Error(`Both primary and fallback failed for ${provider}`);
      }
    }
  }

  private recordFailure(provider: string) {
    const now = Date.now();
    const history = this.fallbackHistory.get(provider) || { lastFailure: 0, failureCount: 0 };
    
    this.fallbackHistory.set(provider, {
      lastFailure: now,
      failureCount: history.failureCount + 1
    });
  }

  private recordSuccess(provider: string) {
    // Reset failure count on success
    this.fallbackHistory.set(provider, {
      lastFailure: 0,
      failureCount: 0
    });
  }

  getProviderHealth(provider: string): { healthy: boolean; failureCount: number } {
    const history = this.fallbackHistory.get(provider);
    if (!history) return { healthy: true, failureCount: 0 };

    const isHealthy = history.failureCount < 3 || 
                     (Date.now() - history.lastFailure) > 300000; // 5 minutes

    return { healthy: isHealthy, failureCount: history.failureCount };
  }

  // Get all provider statuses
  getAllProviderHealth(): Record<string, { healthy: boolean; failureCount: number }> {
    const providers = ['HYPERION', 'NODIT', 'TAPP', 'KANA'];
    const result: Record<string, { healthy: boolean; failureCount: number }> = {};
    
    providers.forEach(provider => {
      result[provider] = this.getProviderHealth(provider);
    });
    
    return result;
  }

  // Reset all provider histories
  reset() {
    this.fallbackHistory.clear();
  }

  // Get failure history for debugging
  getFailureHistory(): Map<string, { lastFailure: number; failureCount: number }> {
    return new Map(this.fallbackHistory);
  }
}

export default FallbackHandler;