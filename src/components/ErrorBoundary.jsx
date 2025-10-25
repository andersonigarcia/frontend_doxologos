import React from 'react';
import { useErrorBoundary } from '../hooks/useErrorTracking';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Track the error
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });

    // Log error details for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Oops! Algo deu errado
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              Encontramos um problema inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver isso.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Tentar novamente
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Ir para início
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-gray-50 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Detalhes técnicos (apenas em desenvolvimento)
                </summary>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for easier error boundary usage
export const withErrorBoundary = (Component, errorFallback) => {
  const WrappedComponent = (props) => {
    const { trackError } = useErrorBoundary();
    
    return (
      <ErrorBoundary onError={trackError} fallback={errorFallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const PageErrorBoundary = ({ children, pageName }) => {
  const { trackError } = useErrorBoundary();
  
  const handleError = (error, errorInfo) => {
    trackError(error, {
      ...errorInfo,
      page: pageName,
      context: 'page'
    });
  };

  const errorFallback = (error, retry) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Erro na página {pageName}
        </h1>
        <p className="text-gray-600 mb-6">
          Não foi possível carregar esta página. Tente recarregar ou voltar para o início.
        </p>
        <div className="space-x-4">
          <button
            onClick={retry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md inline-block"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary onError={handleError} fallback={errorFallback}>
      {children}
    </ErrorBoundary>
  );
};

export const ComponentErrorBoundary = ({ children, componentName }) => {
  const { trackError } = useErrorBoundary();
  
  const handleError = (error, errorInfo) => {
    trackError(error, {
      ...errorInfo,
      component: componentName,
      context: 'component'
    });
  };

  const errorFallback = (error, retry) => (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Erro no componente
          </h3>
          <p className="mt-1 text-sm text-red-700">
            Não foi possível renderizar este componente. 
          </p>
          <button
            onClick={retry}
            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary onError={handleError} fallback={errorFallback}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;