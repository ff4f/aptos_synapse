/**
 * Environment Variables Validator for all sponsor integrations
 * Ensures all required API keys and configurations are properly set
 */

import { logger } from './logger';

interface EnvConfig {
  key: string;
  required: boolean;
  description: string;
  provider: 'NODIT' | 'HYPERION' | 'KANA' | 'TAPP' | 'GENERAL';
  sensitive: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  providerStatus: Record<string, { valid: boolean; errors: string[] }>;
}

class EnvValidator {
  private static instance: EnvValidator;
  private envConfigs: EnvConfig[] = [
    // Nodit configurations
    {
      key: 'NEXT_PUBLIC_NODIT_APTOS_API_KEY',
      required: true,
      description: 'Nodit Aptos API Key for blockchain data access',
      provider: 'NODIT',
      sensitive: true,
      validator: (value) => value.length > 10
    },
    {
      key: 'NEXT_PUBLIC_NODIT_ETH_API_KEY',
      required: true,
      description: 'Nodit Ethereum API Key for cross-chain functionality',
      provider: 'NODIT',
      sensitive: true,
      validator: (value) => value.length > 10
    },
    {
      key: 'NEXT_PUBLIC_NODIT_APTOS_URL',
      required: true,
      description: 'Nodit Aptos API Base URL',
      provider: 'NODIT',
      sensitive: false,
      defaultValue: 'https://aptos-mainnet.nodit.io',
      validator: (value) => value.startsWith('https://')
    },
    {
      key: 'NEXT_PUBLIC_NODIT_ETH_URL',
      required: true,
      description: 'Nodit Ethereum API Base URL',
      provider: 'NODIT',
      sensitive: false,
      defaultValue: 'https://eth-mainnet.nodit.io',
      validator: (value) => value.startsWith('https://')
    },

    // Hyperion configurations
    {
      key: 'NEXT_PUBLIC_HYPERION_API_KEY',
      required: true,
      description: 'Hyperion Analytics API Key for DeFi insights',
      provider: 'HYPERION',
      sensitive: true,
      validator: (value) => value.length > 15
    },
    {
      key: 'NEXT_PUBLIC_HYPERION_API_URL',
      required: true,
      description: 'Hyperion Analytics API Base URL',
      provider: 'HYPERION',
      sensitive: false,
      defaultValue: 'https://api.hyperion.xyz',
      validator: (value) => value.startsWith('https://')
    },
    {
      key: 'NEXT_PUBLIC_HYPERION_WS_URL',
      required: false,
      description: 'Hyperion WebSocket URL for real-time analytics',
      provider: 'HYPERION',
      sensitive: false,
      defaultValue: 'wss://ws.hyperion.xyz',
      validator: (value) => value.startsWith('wss://')
    },

    // Kana Labs configurations
    {
      key: 'NEXT_PUBLIC_KANA_API_KEY',
      required: true,
      description: 'Kana Labs API Key for cross-chain bridge',
      provider: 'KANA',
      sensitive: true,
      validator: (value) => value.length > 12
    },
    {
      key: 'NEXT_PUBLIC_KANA_API_URL',
      required: true,
      description: 'Kana Labs API Base URL',
      provider: 'KANA',
      sensitive: false,
      defaultValue: 'https://api.kanalabs.io',
      validator: (value) => value.startsWith('https://')
    },

    // Tapp.Exchange configurations
    {
      key: 'NEXT_PUBLIC_TAPP_API_KEY',
      required: true,
      description: 'Tapp.Exchange API Key for DEX aggregation',
      provider: 'TAPP',
      sensitive: true,
      validator: (value) => value.length > 10
    },
    {
      key: 'NEXT_PUBLIC_TAPP_API_URL',
      required: true,
      description: 'Tapp.Exchange API Base URL',
      provider: 'TAPP',
      sensitive: false,
      defaultValue: 'https://api.tapp.exchange',
      validator: (value) => value.startsWith('https://')
    },

    // General configurations
    {
      key: 'NEXT_PUBLIC_NETWORK',
      required: false,
      description: 'Target network (mainnet/testnet)',
      provider: 'GENERAL',
      sensitive: false,
      defaultValue: 'mainnet',
      validator: (value) => ['mainnet', 'testnet', 'devnet'].includes(value)
    },
    {
      key: 'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID',
      required: false,
      description: 'WalletConnect Project ID for wallet integration',
      provider: 'GENERAL',
      sensitive: true
    }
  ];

  private constructor() {}

  static getInstance(): EnvValidator {
    if (!EnvValidator.instance) {
      EnvValidator.instance = new EnvValidator();
    }
    return EnvValidator.instance;
  }

  private getEnvValue(key: string): string | undefined {
    // In browser environment, only NEXT_PUBLIC_ variables are available
    if (typeof window !== 'undefined') {
      return process.env[key];
    }
    // In Node.js environment (build time), all variables are available
    return process.env[key];
  }

  validateAll(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequired: string[] = [];
    const providerStatus: Record<string, { valid: boolean; errors: string[] }> = {};

    // Initialize provider status
    const providers = ['NODIT', 'HYPERION', 'KANA', 'TAPP', 'GENERAL'];
    providers.forEach(provider => {
      providerStatus[provider] = { valid: true, errors: [] };
    });

    this.envConfigs.forEach(config => {
      const value = this.getEnvValue(config.key);
      const provider = config.provider;

      if (!value) {
        if (config.required) {
          const error = `Missing required environment variable: ${config.key} (${config.description})`;
          errors.push(error);
          missingRequired.push(config.key);
          providerStatus[provider].valid = false;
          providerStatus[provider].errors.push(error);
          
          logger.error('ENV_VALIDATOR', `Missing required env var: ${config.key}`, {
            provider,
            description: config.description
          });
        } else if (config.defaultValue) {
          warnings.push(`Using default value for ${config.key}: ${config.defaultValue}`);
          logger.warn('ENV_VALIDATOR', `Using default value for ${config.key}`, {
            provider,
            defaultValue: config.defaultValue
          });
        }
        return;
      }

      // Validate value if validator is provided
      if (config.validator && !config.validator(value)) {
        const error = `Invalid value for ${config.key}: ${config.description}`;
        errors.push(error);
        providerStatus[provider].valid = false;
        providerStatus[provider].errors.push(error);
        
        logger.error('ENV_VALIDATOR', `Invalid env var value: ${config.key}`, {
          provider,
          value: config.sensitive ? '[REDACTED]' : value
        });
      } else {
        logger.info('ENV_VALIDATOR', `Valid env var: ${config.key}`, {
          provider,
          hasValue: true,
          value: config.sensitive ? '[REDACTED]' : value
        });
      }
    });

    const isValid = errors.length === 0;

    logger.info('ENV_VALIDATOR', 'Environment validation completed', {
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      missingRequiredCount: missingRequired.length,
      providerStatus: Object.fromEntries(
        Object.entries(providerStatus).map(([key, status]) => [key, status.valid])
      )
    });

    return {
      isValid,
      errors,
      warnings,
      missingRequired,
      providerStatus
    };
  }

  validateProvider(provider: 'NODIT' | 'HYPERION' | 'KANA' | 'TAPP' | 'GENERAL'): { valid: boolean; errors: string[]; warnings: string[] } {
    const providerConfigs = this.envConfigs.filter(config => config.provider === provider);
    const errors: string[] = [];
    const warnings: string[] = [];

    providerConfigs.forEach(config => {
      const value = this.getEnvValue(config.key);

      if (!value) {
        if (config.required) {
          errors.push(`Missing required: ${config.key}`);
        } else if (config.defaultValue) {
          warnings.push(`Using default: ${config.key}`);
        }
        return;
      }

      if (config.validator && !config.validator(value)) {
        errors.push(`Invalid value: ${config.key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  getProviderConfig(provider: 'NODIT' | 'HYPERION' | 'KANA' | 'TAPP' | 'GENERAL'): EnvConfig[] {
    return this.envConfigs.filter(config => config.provider === provider);
  }

  getMissingRequiredVars(): string[] {
    return this.envConfigs
      .filter(config => config.required && !this.getEnvValue(config.key))
      .map(config => config.key);
  }

  generateEnvTemplate(): string {
    const template = this.envConfigs
      .map(config => {
        const comment = `# ${config.description} (${config.provider}${config.required ? ' - REQUIRED' : ' - OPTIONAL'})`;
        const envLine = `${config.key}=${config.defaultValue || ''}`;
        return `${comment}\n${envLine}`;
      })
      .join('\n\n');

    return `# Aptos Synapse Environment Configuration\n# Generated by EnvValidator\n\n${template}`;
  }

  logValidationSummary(): void {
    const result = this.validateAll();
    
    console.group('🔧 Environment Validation Summary');
    console.log(`✅ Overall Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
    
    if (result.errors.length > 0) {
      console.group('❌ Errors:');
      result.errors.forEach(error => console.error(`  • ${error}`));
      console.groupEnd();
    }
    
    if (result.warnings.length > 0) {
      console.group('⚠️ Warnings:');
      result.warnings.forEach(warning => console.warn(`  • ${warning}`));
      console.groupEnd();
    }
    
    console.group('📊 Provider Status:');
    Object.entries(result.providerStatus).forEach(([provider, status]) => {
      const icon = status.valid ? '✅' : '❌';
      console.log(`  ${icon} ${provider}: ${status.valid ? 'Valid' : `Invalid (${status.errors.length} errors)`}`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }
}

// Export singleton instance
export const envValidator = EnvValidator.getInstance();
export default EnvValidator;
export type { EnvConfig, ValidationResult };