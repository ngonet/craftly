import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AuthProvider } from './shared/lib/auth';
import { DisplaySettingsProvider } from './shared/lib/display-settings';
import { queryClient } from './shared/lib/query-client';
import { RouterProvider } from './shared/lib/router';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import './shared/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DisplaySettingsProvider>
          <AuthProvider>
            <RouterProvider>
              <App />
            </RouterProvider>
          </AuthProvider>
        </DisplaySettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
