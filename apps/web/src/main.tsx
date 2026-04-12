import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import { App } from './App';
import { AuthProvider } from './shared/lib/auth';
import { queryClient } from './shared/lib/query-client';
import { RouterProvider } from './shared/lib/router';
import './shared/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider>
          <App />
        </RouterProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
