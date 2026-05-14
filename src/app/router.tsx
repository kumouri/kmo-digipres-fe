import { createBrowserRouter } from "react-router";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
        ],
      },
    ],
  },
]);
