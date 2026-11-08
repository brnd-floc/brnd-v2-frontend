/**
 * BRND Application
 * @author German D. Schneck <german.schneck@gmail.com>
 * @author Jorge Pablo Franetovic <jpfraneto@gmail.com>
 */
// Dependencies
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { config } from './shared/config/wagmi';

// SCSS StyleSheet
import './shared/styles/global.scss';
import '@farcaster/auth-kit/styles.css';

// React-Query Provider with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      refetchOnMount: false, // Prevent refetch on component mount
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      retry: 1, // Limit retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Configuration
import { router } from './config/router';

// Error Boundary
import { ErrorBoundary } from './shared/components/ErrorBoundary';

// A tab left open during a deploy can still reference deleted Vite chunks.
window.addEventListener('vite:preloadError', (event) => {
  if (!navigator.onLine) return;

  try {
    const key = 'brnd:module-reload';
    const lastReload = Number(sessionStorage.getItem(key));
    const now = Date.now();

    // Avoid a reload loop if the failure persists after refreshing.
    if (now - lastReload < 30_000) return;

    sessionStorage.setItem(key, String(now));
  } catch {
    // Without a persisted guard, let the normal error UI handle the failure.
    return;
  }

  event.preventDefault();
  window.location.reload();
});

if (import.meta.env.VITE_ENVIRONMENT === 'dev') {
  import('eruda').then((eruda) => eruda.default.init());
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
