'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { AuthProvider } from '@susmi/auth';
import { NotificationsProvider } from '@/hooks/useNotifications';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <NotificationsProvider>
          {children}
          <Toaster position="top-right" richColors />
        </NotificationsProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
