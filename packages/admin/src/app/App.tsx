import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { CrmProvider } from "@kmosf/crm-components";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { adminClient } from "./api/client";
import { AuthProvider } from "./auth/AuthProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CrmProvider client={adminClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </CrmProvider>
        <Toaster richColors closeButton position="top-right" />
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
