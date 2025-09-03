/**
 * Unified logging system with provider-specific tagging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Provider = 'HYPERION' | 'NODIT' | 'TAPP' | 'KANA' | 'SYNAPSE';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  provider: Provider;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: LogLevel, provider: Provider, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      provider,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also output to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = console[level] || console.log;
      consoleMethod(`[${provider}] ${message}`, data || '');
    }
  }

  debug(provider: Provider, message: string, data?: any) {
    this.log('debug', provider, message, data);
  }

  info(provider: Provider, message: string, data?: any) {
    this.log('info', provider, message, data);
  }

  warn(provider: Provider, message: string, data?: any) {
    this.log('warn', provider, message, data);
  }

  error(provider: Provider, message: string, data?: any) {
    this.log('error', provider, message, data);
  }

  getLogs(filter?: { provider?: Provider; level?: LogLevel; since?: number }): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (filter?.provider) {
      filteredLogs = filteredLogs.filter(log => log.provider === filter.provider);
    }
    
    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
    }

    return filteredLogs;
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  getLogsByProvider(provider: Provider, count: number = 20): LogEntry[] {
    return this.logs
      .filter(log => log.provider === provider)
      .slice(-count);
  }

  getErrorLogs(since?: number): LogEntry[] {
    return this.getLogs({ level: 'error', since });
  }

  getProviderStats(): Record<Provider, { total: number; errors: number; warnings: number }> {
    const stats: Record<string, { total: number; errors: number; warnings: number }> = {};
    const providers: Provider[] = ['HYPERION', 'NODIT', 'TAPP', 'KANA', 'SYNAPSE'];
    
    providers.forEach(provider => {
      const providerLogs = this.logs.filter(log => log.provider === provider);
      stats[provider] = {
        total: providerLogs.length,
        errors: providerLogs.filter(log => log.level === 'error').length,
        warnings: providerLogs.filter(log => log.level === 'warn').length
      };
    });
    
    return stats as Record<Provider, { total: number; errors: number; warnings: number }>;
  }

  clear() {
    this.logs = [];
  }

  clearProvider(provider: Provider) {
    this.logs = this.logs.filter(log => log.provider !== provider);
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Import logs (useful for debugging)
  importLogs(logsJson: string) {
    try {
      const importedLogs = JSON.parse(logsJson) as LogEntry[];
      this.logs = [...this.logs, ...importedLogs];
      
      // Keep only recent logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    } catch (error) {
      console.error('Failed to import logs:', error);
    }
  }
}

export const logger = Logger.getInstance();
export type { LogLevel, Provider, LogEntry };
export default Logger;