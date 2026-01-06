/**
 * BRND Application
 * @author German D. Schneck <german.schneck@gmail.com>
 * @author Jorge Pablo Franetovic <jpfraneto@gmail.com>
 */
// Dependencies
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { config } from "./shared/config/wagmi";

// SCSS StyleSheet
import "./shared/styles/global.scss";
import "@farcaster/auth-kit/styles.css";

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
import { router } from "./config/router";

// Error Boundary
import { ErrorBoundary } from "./shared/components/ErrorBoundary";

if (import.meta.env.VITE_ENVIRONMENT === "dev") {
  import("eruda").then((eruda) => eruda.default.init());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
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
