import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ProfileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Profile error boundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log to error tracking service (e.g., Sentry) if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0B0E11]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              {/* Error Title */}
              <h2 className="text-xl font-bold text-white mb-2">
                Bir şeyler ters gitti
              </h2>

              {/* Error Message */}
              <p className="text-white/60 mb-6 text-sm leading-relaxed">
                {this.state.error?.message || 'Profil yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'}
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mb-6 text-left">
                  <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 mb-2">
                    Teknik Detaylar (Geliştirici Modu)
                  </summary>
                  <pre className="text-[10px] text-white/40 bg-black/20 p-3 rounded-lg overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tekrar Dene
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-teal-600 transition-all"
                >
                  Sayfayı Yenile
                </button>
              </div>

              {/* Help Text */}
              <p className="mt-4 text-xs text-white/30">
                Sorun devam ederse, lütfen destek ekibiyle iletişime geçin.
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
