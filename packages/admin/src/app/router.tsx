import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RouteFallback } from "./components/RouteFallback";
import { DashboardPage } from "./pages/DashboardPage";

// Each route below is its own dynamic-imported chunk. The Dashboard stays
// eager because it's the post-login landing screen — splitting it would just
// add a Suspense flash for no real win. The four CRM resources lazy-load
// from @kmosf/crm-components (the library chunk is shared across all of
// them, so the first navigation pays the cost and the rest are instant).
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const EmbedDemoPage = lazy(() =>
  import("./pages/EmbedDemoPage").then((m) => ({ default: m.EmbedDemoPage })),
);
const ContactsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ContactsList })),
);
const ContactDetail = lazy(() =>
  import("./pages/contacts/ContactDetail").then((m) => ({ default: m.ContactDetail })),
);
const CompaniesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.CompaniesList })),
);
const CompanyDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.CompanyDetail })),
);
const DealsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.DealsList })),
);
const DealDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.DealDetail })),
);
const ActivitiesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ActivitiesList })),
);
const ActivityDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ActivityDetail })),
);
const QuotesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.QuotesList })),
);
const QuoteDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.QuoteDetail })),
);
const InvoicesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.InvoicesList })),
);
const InvoiceDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.InvoiceDetail })),
);
const TicketsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.TicketsList })),
);
const TicketDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.TicketDetail })),
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
    path: "/embed-demo",
    element: (
      <Suspense fallback={<RouteFallback />}>
        <EmbedDemoPage />
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
              { path: "quotes", element: <QuotesList /> },
              { path: "quotes/:id", element: <QuoteDetail /> },
              { path: "invoices", element: <InvoicesList /> },
              { path: "invoices/:id", element: <InvoiceDetail /> },
              { path: "tickets", element: <TicketsList /> },
              { path: "tickets/:id", element: <TicketDetail /> },
            ],
          },
        ],
      },
    ],
  },
]);
