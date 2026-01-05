
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import App from '@/App';
    import '@/index.css';
    import { AuthProvider } from '@/contexts/SupabaseAuthContext';

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <App />
              </AuthProvider>
            </QueryClientProvider>
      </React.StrictMode>
    );
  