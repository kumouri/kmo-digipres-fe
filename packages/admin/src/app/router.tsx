import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RequireAdmin } from "./auth/RequireAdmin";
import { RouteFallback } from "./components/RouteFallback";
import { DashboardPage } from "./pages/DashboardPage";
import { useAuth } from "./auth/useAuth";
import { isAdmin } from "./auth/roles";

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
const KnowledgeBaseList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.KnowledgeBaseList })),
);
const KnowledgeBaseDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.KnowledgeBaseDetail })),
);
const InboxList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.InboxList })),
);
const InboxDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.InboxDetail })),
);
const FieldDefinitionsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.FieldDefinitionsList })),
);
const FieldDefinitionDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.FieldDefinitionDetail })),
);
const AuditList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.AuditList })),
);
const ReportsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ReportsList })),
);
const ReportDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ReportDetail })),
);
const DashboardsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.DashboardsList })),
);
const DashboardDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.DashboardDetail })),
);
const ProjectsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ProjectsList })),
);
const ProjectDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ProjectDetail })),
);
const TimesheetPageInner = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.TimesheetPage })),
);
const ExpensesListInner = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ExpensesList })),
);
const ExpenseDetailInner = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ExpenseDetail })),
);
const ContractsList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ContractsList })),
);
const ContractDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ContractDetail })),
);
const ContractTemplatesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ContractTemplatesList })),
);
const ContractTemplateDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ContractTemplateDetail })),
);

/** Wrapper: provides userId from auth context to TimesheetPage */
function TimesheetPageRoute() {
  const { user } = useAuth();
  return <TimesheetPageInner userId={user?.id ?? ""} />;
}

/** Wrapper: provides userId from auth context to ExpensesList */
function ExpensesListRoute() {
  const { user, roles } = useAuth();
  void roles; // ExpensesList currently ignores isAdmin; future: pass it
  return <ExpensesListInner userId={user?.id ?? ""} />;
}

/** Wrapper: provides isAdmin from auth context to ExpenseDetail */
function ExpenseDetailRoute() {
  const { roles } = useAuth();
  return <ExpenseDetailInner isAdmin={isAdmin(roles)} />;
}

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
              { path: "knowledge-base", element: <KnowledgeBaseList /> },
              { path: "knowledge-base/:id", element: <KnowledgeBaseDetail /> },
              { path: "inbox", element: <InboxList /> },
              { path: "inbox/:id", element: <InboxDetail /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: "field-definitions", element: <FieldDefinitionsList /> },
                  { path: "field-definitions/:id", element: <FieldDefinitionDetail /> },
                  { path: "audit", element: <AuditList /> },
                ],
              },
              { path: "reports", element: <ReportsList /> },
              { path: "reports/:id", element: <ReportDetail /> },
              { path: "dashboards", element: <DashboardsList /> },
              { path: "dashboards/:id", element: <DashboardDetail /> },
              { path: "projects", element: <ProjectsList /> },
              { path: "projects/:id", element: <ProjectDetail /> },
              { path: "timesheet", element: <TimesheetPageRoute /> },
              { path: "expenses", element: <ExpensesListRoute /> },
              { path: "expenses/:id", element: <ExpenseDetailRoute /> },
              { path: "contracts", element: <ContractsList /> },
              { path: "contracts/:id", element: <ContractDetail /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: "contract-templates", element: <ContractTemplatesList /> },
                  { path: "contract-templates/:id", element: <ContractTemplateDetail /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
