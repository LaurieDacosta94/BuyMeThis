import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
            <div className="bg-red-500 p-6 flex justify-center">
               <AlertTriangle className="h-16 w-16 text-white" />
            </div>
            <div className="p-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Something went wrong</h1>
              <p className="text-slate-600 text-center mb-6">
                The application encountered an unexpected error.
              </p>
              
              <div className="bg-slate-900 rounded-lg p-4 mb-6 overflow-x-auto">
                <code className="text-red-400 text-sm font-mono block mb-2">
                  {this.state.error && this.state.error.toString()}
                </code>
                {this.state.errorInfo && (
                  <pre className="text-slate-500 text-xs font-mono whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> Reload Application
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}