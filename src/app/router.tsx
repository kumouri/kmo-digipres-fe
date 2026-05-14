import { createBrowserRouter } from "react-router";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ContactsList } from "./pages/contacts/ContactsList";
import { ContactDetail } from "./pages/contacts/ContactDetail";
import { CompaniesList } from "./pages/companies/CompaniesList";
import { CompanyDetail } from "./pages/companies/CompanyDetail";
import { DealsList } from "./pages/deals/DealsList";
import { DealDetail } from "./pages/deals/DealDetail";
import { ActivitiesList } from "./pages/activities/ActivitiesList";
import { ActivityDetail } from "./pages/activities/ActivityDetail";

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
          { path: "contacts", element: <ContactsList /> },
          { path: "contacts/:id", element: <ContactDetail /> },
          { path: "companies", element: <CompaniesList /> },
          { path: "companies/:id", element: <CompanyDetail /> },
          { path: "deals", element: <DealsList /> },
          { path: "deals/:id", element: <DealDetail /> },
          { path: "activities", element: <ActivitiesList /> },
          { path: "activities/:id", element: <ActivityDetail /> },
        ],
      },
    ],
  },
]);
