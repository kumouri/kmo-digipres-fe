import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RouteFallback } from "./components/RouteFallback";
import { DashboardPage } from "./pages/DashboardPage";

// Each route below is its own dynamic-imported chunk. The Dashboard stays
// eager because it's the post-login landing screen — splitting it would just
// add a Suspense flash for no real win.
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const ContactsList = lazy(() =>
  import("./pages/contacts/ContactsList").then((m) => ({ default: m.ContactsList })),
);
const ContactDetail = lazy(() =>
  import("./pages/contacts/ContactDetail").then((m) => ({ default: m.ContactDetail })),
);
const CompaniesList = lazy(() =>
  import("./pages/companies/CompaniesList").then((m) => ({ default: m.CompaniesList })),
);
const CompanyDetail = lazy(() =>
  import("./pages/companies/CompanyDetail").then((m) => ({ default: m.CompanyDetail })),
);
const DealsList = lazy(() =>
  import("./pages/deals/DealsList").then((m) => ({ default: m.DealsList })),
);
const DealDetail = lazy(() =>
  import("./pages/deals/DealDetail").then((m) => ({ default: m.DealDetail })),
);
const ActivitiesList = lazy(() =>
  import("./pages/activities/ActivitiesList").then((m) => ({ default: m.ActivitiesList })),
);
const ActivityDetail = lazy(() =>
  import("./pages/activities/ActivityDetail").then((m) => ({ default: m.ActivityDetail })),
);

function LazyOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            element: <LazyOutlet />,
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
    ],
  },
]);
