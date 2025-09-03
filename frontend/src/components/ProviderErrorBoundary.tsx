import React, { Component, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface ProviderErrorBoundaryProps {
  children: ReactNode;
  provider: 'NODIT' | 'HYPERION' | 'KANA' | 'TAPP';
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ProviderErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

class ProviderErrorBoundary extends Component<ProviderErrorBoundaryProps, ProviderErrorBoundaryState> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ProviderErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProviderErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { provider, onError } = this.props;
    
    // Log error with provider context
    logger.error(provider, 'Component error boundary triggered', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-retry after delay if under max retries
    if (this.state.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  scheduleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    this.retryTimeout = setTimeout(() => {
      logger.info(this.props.provider, 'Attempting automatic retry', {
        retryCount: this.state.retryCount,
        retryDelay
      });
      this.handleRetry();
    }, retryDelay);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleManualRetry = () => {
    logger.info(this.props.provider, 'Manual retry triggered', {
      retryCount: this.state.retryCount
    });
    this.handleRetry();
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  getProviderDisplayName = () => {
    const names = {
      NODIT: 'Nodit',
      HYPERION: 'Hyperion',
      KANA: 'Kana Labs',
      TAPP: 'Tapp.Exchange'
    };
    return names[this.props.provider] || this.props.provider;
  };

  getProviderColor = () => {
    const colors = {
      NODIT: 'blue',
      HYPERION: 'purple',
      KANA: 'green',
      TAPP: 'orange'
    };
    return colors[this.props.provider] || 'gray';
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, provider } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const providerName = this.getProviderDisplayName();
      const color = this.getProviderColor();
      const canRetry = retryCount < this.maxRetries;

      return (
        <div className={`border-l-4 border-${color}-500 bg-${color}-50 p-4 rounded-r-lg`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 text-${color}-400`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium text-${color}-800`}>
                {providerName} Service Error
              </h3>
              <div className={`mt-2 text-sm text-${color}-700`}>
                <p>There was an issue loading content from {providerName}.</p>
                {error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer hover:underline">Error Details</summary>
                    <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                      {error.message}
                    </pre>
                  </details>
                )}
              </div>
              <div className="mt-4 flex space-x-3">
                {canRetry && (
                  <button
                    onClick={this.handleManualRetry}
                    className={`bg-${color}-100 hover:bg-${color}-200 text-${color}-800 px-3 py-1 rounded text-sm font-medium transition-colors`}
                  >
                    Retry ({this.maxRetries - retryCount} attempts left)
                  </button>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Reload Page
                </button>
              </div>
              {retryCount >= this.maxRetries && (
                <div className={`mt-3 p-2 bg-${color}-100 rounded text-sm text-${color}-800`}>
                  <strong>Max retries exceeded.</strong> Please check your connection or try again later.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easy wrapping
export const withProviderErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  provider: 'NODIT' | 'HYPERION' | 'KANA' | 'TAPP',
  fallback?: ReactNode
) => {
  const WithErrorBoundary = (props: P) => (
    <ProviderErrorBoundary provider={provider} fallback={fallback}>
      <WrappedComponent {...props} />
    </ProviderErrorBoundary>
  );

  WithErrorBoundary.displayName = `withProviderErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
};

// Specific error boundaries for each provider
export const NoditErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ProviderErrorBoundary provider="NODIT" fallback={fallback}>
    {children}
  </ProviderErrorBoundary>
);

export const HyperionErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ProviderErrorBoundary provider="HYPERION" fallback={fallback}>
    {children}
  </ProviderErrorBoundary>
);

export const KanaErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ProviderErrorBoundary provider="KANA" fallback={fallback}>
    {children}
  </ProviderErrorBoundary>
);

export const TappErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ProviderErrorBoundary provider="TAPP" fallback={fallback}>
    {children}
  </ProviderErrorBoundary>
);

export default ProviderErrorBoundary;