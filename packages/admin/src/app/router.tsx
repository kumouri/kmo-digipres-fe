import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RequireAdmin } from "./auth/RequireAdmin";
import { RequireNotContractor } from "./auth/RequireNotContractor";
import { RouteFallback } from "./components/RouteFallback";
import { DashboardPage } from "./pages/DashboardPage";
import { useAuth } from "./auth/useAuth";
import { isAdmin, isContractor } from "./auth/roles";

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
const ProjectsListInner = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ProjectsList })),
);
const ProjectDetailInner = lazy(() =>
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
const TimesheetApprovals = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.TimesheetApprovals })),
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
const RecurringInvoicesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.RecurringInvoicesList })),
);
const RecurringInvoiceDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.RecurringInvoiceDetail })),
);
const ReviewRepliesList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ReviewRepliesList })),
);
const MissedCallInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.MissedCallInbox })),
);
const CallbackQueue = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.CallbackQueue })),
);
const QuoteInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.QuoteInbox })),
);
const PriceBookConfig = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.PriceBookConfig })),
);
// Home Services T11 "QuoteCloser" — follow-up config card (window / cadence
// toggle / financing-nudge copy) + recovery-funnel analytics panel (quotes
// sent → followed-up → recovered → review-requested + recovery rate). Hand-
// written client (the BE QuoteCloserConfigController and QuoteCloserController
// are @ConditionalOnProperty(kmosf.modules.quoting)-gated AND require the
// nurture module, so all routes are absent from the generated openapi types —
// the T8 PriceBookConfig / T5 CallbackController precedent).
const QuoteCloserSettings = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.QuoteCloserSettings,
  })),
);
const NoShowRiskView = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.NoShowRiskView })),
);
const WaitlistBoard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.WaitlistBoard })),
);
const SalonReviewInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.SalonReviewInbox })),
);
const ReviewBoostBoard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ReviewBoostBoard })),
);
const StyleConsultInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.StyleConsultInbox })),
);
// Salon T12 "StylerMatch" — staff stylist-match console: create-match form →
// ranked best-fit stylists (rationale + score + not-certified badge) +
// Book-top-match + match inbox + accept-rate analytics + token-issue.
// Hand-written client (@ConditionalOnProperty(kmosf.modules.chairfill)-gated;
// absent from openapi.json — the T9 StyleConsultInbox precedent). Gated behind
// RequireNotContractor grouped with the other ChairFill surfaces.
const StylerMatchConsole = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.StylerMatchConsole })),
);
const ListingConsole = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ListingConsole })),
);
const ListingDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ListingDetail })),
);
const ConciergeInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ConciergeInbox })),
);
const ConciergeTranscript = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.ConciergeTranscript,
  })),
);
const MarketingReviewQueue = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.MarketingReviewQueue,
  })),
);
// Real Estate Concierge (T10 — Listing Prep Studio): per-listing generate
// (MLS + 4-week social calendar + email) → Fair-Housing lint panel → Approve /
// Skip queue. Hand-written client (the BE ListingPrepController is
// @ConditionalOnProperty(kmosf.modules.realestate)-gated). Gated behind
// RequireNotContractor, grouped with the other RE surfaces.
const ListingPrepStudio = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.ListingPrepStudio,
  })),
);
const NurtureDashboard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.NurtureDashboard,
  })),
);
const MidnightResponderPanel = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.MidnightResponderPanel,
  })),
);
const RevenueReviveDashboard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.RevenueReviveDashboard,
  })),
);
const SwitchboardPanel = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.SwitchboardPanel,
  })),
);
const RescheduleBoard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.RescheduleBoard,
  })),
);
const RiskDayView = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.RiskDayView })),
);
const RecallBoard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.RecallBoard })),
);
const CallbackInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.CallbackInbox })),
);
const FrontDeskReviewInbox = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.ReviewInbox })),
);
const AppointmentConsole = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.AppointmentConsole,
  })),
);
const TeamList = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.TeamList })),
);
const TeamDetail = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({ default: m.TeamDetail })),
);
const ArAgingDashboard = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.ArAgingDashboard,
  })),
);
const ProposalStudio = lazy(() =>
  import("@kmosf/crm-components").then((m) => ({
    default: m.ProposalStudio,
  })),
);

/**
 * Wrappers: feed role context into the shared CRM components. A scoped-down
 * contractor (CONTRACTOR && !ADMIN) is denied the broad staff readers on the
 * backend (GET /projects, /time-entries, /expenses, … → 4135), so these
 * surfaces switch to the /me/contractor/** endpoints when isContractor is set.
 * Staff/admin keep the existing behavior unchanged.
 */
function ProjectsListRoute() {
  const { roles } = useAuth();
  return <ProjectsListInner isContractor={isContractor(roles)} />;
}

function ProjectDetailRoute() {
  const { roles } = useAuth();
  return <ProjectDetailInner isContractor={isContractor(roles)} />;
}

function TimesheetPageRoute() {
  const { user, roles } = useAuth();
  return (
    <TimesheetPageInner
      userId={user?.id ?? ""}
      isContractor={isContractor(roles)}
    />
  );
}

function ExpensesListRoute() {
  const { user, roles } = useAuth();
  return (
    <ExpensesListInner
      userId={user?.id ?? ""}
      isContractor={isContractor(roles)}
    />
  );
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
              // Available to everyone (incl. scoped-down contractors):
              // dashboard + their own project / time / expense surfaces.
              { index: true, element: <DashboardPage /> },
              { path: "projects", element: <ProjectsListRoute /> },
              { path: "projects/:id", element: <ProjectDetailRoute /> },
              { path: "timesheet", element: <TimesheetPageRoute /> },
              { path: "expenses", element: <ExpensesListRoute /> },
              { path: "expenses/:id", element: <ExpenseDetailRoute /> },

              // Everything below is hidden from contractors. The guard is
              // defense-in-depth: a contractor deep-linking any of these is
              // bounced to the dashboard (mirrors the nav filter).
              {
                element: <RequireNotContractor />,
                children: [
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
                  { path: "missed-calls", element: <MissedCallInbox /> },
                  // Home Services T5 "Instant Callback" — revenue-ranked
                  // callback dispatcher queue + recovery stats + config. The
                  // BE CallbackController is home-services AND responder
                  // module-gated; gated behind RequireNotContractor grouped
                  // with the other Home Services surfaces (the T4
                  // SwitchboardPanel precedent). A contractor deep-linking is
                  // bounced.
                  { path: "callback-queue", element: <CallbackQueue /> },
                  // Home Services T8 "QuoteNow" — office quote-inbox (list +
                  // detail: attributes, price range, repair-vs-replace, status)
                  // + price-book config card + homeowner widget token-issue.
                  // The BE controllers are @ConditionalOnProperty(quoting)-
                  // gated; gated behind RequireNotContractor grouped with the
                  // other Home Services surfaces (the T5 CallbackQueue
                  // precedent). A contractor deep-linking is bounced.
                  { path: "instant-quotes", element: <QuoteInbox /> },
                  { path: "quote-settings", element: <PriceBookConfig /> },
                  // Home Services T11 "QuoteCloser" — follow-up config card
                  // (window / cadence toggle / financing-nudge copy) + recovery-
                  // funnel analytics panel (quotes sent → followed-up →
                  // recovered → review-requested + recovery rate). The BE
                  // QuoteCloserConfigController and QuoteCloserController are
                  // @ConditionalOnProperty(kmosf.modules.quoting)-gated AND
                  // require the nurture module; gated behind RequireNotContractor
                  // grouped with the other Home Services surfaces (the T8
                  // PriceBookConfig / T5 CallbackQueue precedent). A contractor
                  // deep-linking is bounced.
                  { path: "quote-follow-up", element: <QuoteCloserSettings /> },
                  // ChairFill salon flagship (CF-5) — staff-visible, like
                  // missed-calls (the BE board/review-draft routes are
                  // STAFF-gated). A contractor deep-linking is bounced.
                  { path: "no-show-risk", element: <NoShowRiskView /> },
                  { path: "waitlist", element: <WaitlistBoard /> },
                  { path: "salon-reviews", element: <SalonReviewInbox /> },
                  // Salon "ReviewBoost" (T6) — per-stylist review-insights board
                  // + config status card. The BE ReviewBoostController is ADMIN +
                  // chairfill-AND-salon-spa-module-gated; gated behind
                  // RequireNotContractor grouped with the other ChairFill surfaces
                  // (the T4 SwitchboardPanel precedent). Read-only surface: no
                  // write endpoint exists.
                  { path: "review-boost", element: <ReviewBoostBoard /> },
                  // Salon T9 "StyleConsult AI" — staff consult inbox (assessment +
                  // service recs + margin-ranked retail recs + "stylist will
                  // confirm" guardrail + booking status), retail-attach analytics
                  // panel, and consult-widget token-issue. The BE
                  // StyleConsultController and StyleConsultTokenController are
                  // @ConditionalOnProperty(kmosf.modules.chairfill)-gated; gated
                  // behind RequireNotContractor grouped with the other ChairFill
                  // surfaces (the T6 ReviewBoostBoard / T8 QuoteInbox precedent).
                  // A contractor deep-linking is bounced.
                  { path: "style-consults", element: <StyleConsultInbox /> },
                  // Salon T12 "StylerMatch" — staff stylist-match console:
                  // create-match form → ranked best-fit stylists (rationale +
                  // score + not-certified badge) + Book-top-match + match inbox
                  // + accept-rate analytics + "Copy match widget link". The BE
                  // StylerMatchController and StylerMatchTokenController are
                  // @ConditionalOnProperty(kmosf.modules.chairfill)-gated; gated
                  // behind RequireNotContractor grouped with the other ChairFill
                  // surfaces (the T9 StyleConsultInbox precedent). A contractor
                  // deep-linking is bounced.
                  { path: "styler-match", element: <StylerMatchConsole /> },
                  // Real Estate Concierge flagship (RE-5b) — staff-visible, like
                  // the ChairFill surfaces (the BE listing/concierge/marketing
                  // routes are STAFF-gated). A contractor deep-linking is bounced.
                  { path: "listings", element: <ListingConsole /> },
                  { path: "listings/:id", element: <ListingDetail /> },
                  { path: "concierge", element: <ConciergeInbox /> },
                  { path: "concierge/:id", element: <ConciergeTranscript /> },
                  { path: "marketing-review", element: <MarketingReviewQueue /> },
                  // Real Estate Concierge (T10 — Listing Prep Studio) — per-listing
                  // one-click prep pack generation (MLS description + 4-week dated
                  // social calendar + email campaign) + Fair-Housing lint review +
                  // Approve / Skip queue. The BE ListingPrepController is
                  // @ConditionalOnProperty(kmosf.modules.realestate)-gated; gated
                  // behind RequireNotContractor grouped with the other RE surfaces
                  // (the MarketingReviewQueue / MidnightResponderPanel precedent).
                  // A contractor deep-linking is bounced.
                  { path: "listing-prep-studio", element: <ListingPrepStudio /> },
                  // RE Database Goldmine (T1) — dormant-lead nurture funnel
                  // dashboard. The BE RE-nurture routes are ADMIN + realestate-
                  // AND-nurture-module-gated; gated behind RequireNotContractor
                  // alongside the other RE surfaces (the AR-FE precedent). A
                  // contractor deep-linking is bounced.
                  { path: "database-goldmine", element: <NurtureDashboard /> },
                  // RE Midnight Responder (T3) — response-latency stats panel
                  // + tier-routing config card. The BE controllers are STAFF +
                  // realestate-AND-responder-module-gated; gated behind
                  // RequireNotContractor grouped with the other RE surfaces
                  // (the T1 Database Goldmine precedent). A contractor
                  // deep-linking is bounced.
                  { path: "midnight-responder", element: <MidnightResponderPanel /> },
                  // AR — Accounts Receivable / Collections module — staff-visible, like
                  // the flagship surfaces (the BE /ar/* routes are STAFF + ar-module-
                  // gated). A contractor deep-linking is bounced.
                  { path: "ar-aging", element: <ArAgingDashboard /> },
                  // Proposals / SOW Studio — staff-visible (the BE /proposals/*
                  // routes are STAFF + proposals-module-gated). A contractor
                  // deep-linking is bounced.
                  { path: "proposals", element: <ProposalStudio /> },
                  // FrontDesk IQ health-practices flagship (FD-5b) — staff-visible,
                  // like the ChairFill / Real Estate surfaces (the BE risk /
                  // recall / callback / review / appointment routes are STAFF-
                  // gated). A contractor deep-linking is bounced.
                  { path: "appointments", element: <AppointmentConsole /> },
                  { path: "risk-day", element: <RiskDayView /> },
                  { path: "recall", element: <RecallBoard /> },
                  { path: "callbacks", element: <CallbackInbox /> },
                  { path: "review-inbox", element: <FrontDeskReviewInbox /> },
                  // Health "RevenueRevive" (T2) — dormant-patient reactivation
                  // funnel dashboard. The BE frontdesk-nurture routes are ADMIN
                  // + frontdesk-AND-nurture-module-gated; gated behind
                  // RequireNotContractor grouped with the other FrontDesk IQ
                  // surfaces (the T1 RE Database Goldmine precedent). PHI-free.
                  { path: "revenue-revive", element: <RevenueReviveDashboard /> },
                  // Health "Switchboard AI" (T4) — logistics config card + call-
                  // deflection stats panel. The BE SwitchboardController is ADMIN
                  // + frontdesk-AND-responder-module-gated; gated behind
                  // RequireNotContractor grouped with the other FrontDesk IQ
                  // surfaces (the T2 RevenueRevive precedent). PHI-free by
                  // construction: config holds only logistics answers.
                  { path: "switchboard", element: <SwitchboardPanel /> },
                  // Health "RescheduleFlow" (T7) — waitlist board + fill-rate
                  // stats. The BE RescheduleController is ADMIN + frontdesk-AND-
                  // waitlist-module-gated; gated behind RequireNotContractor
                  // alongside the other FrontDesk IQ surfaces (the T4
                  // SwitchboardPanel precedent). PHI-free by construction:
                  // logistics-only — provider + time window + show-likelihood.
                  { path: "reschedule-waitlist", element: <RescheduleBoard /> },
                  { path: "reports", element: <ReportsList /> },
                  { path: "reports/:id", element: <ReportDetail /> },
                  { path: "dashboards", element: <DashboardsList /> },
                  { path: "dashboards/:id", element: <DashboardDetail /> },
                  { path: "contracts", element: <ContractsList /> },
                  { path: "contracts/:id", element: <ContractDetail /> },
                  { path: "recurring-invoices", element: <RecurringInvoicesList /> },
                  { path: "recurring-invoices/:id", element: <RecurringInvoiceDetail /> },
                  // Admin-only surfaces (also contractor-hidden by the wrapper).
                  {
                    element: <RequireAdmin />,
                    children: [
                      { path: "review-replies", element: <ReviewRepliesList /> },
                      { path: "team", element: <TeamList /> },
                      { path: "team/:id", element: <TeamDetail /> },
                      { path: "field-definitions", element: <FieldDefinitionsList /> },
                      { path: "field-definitions/:id", element: <FieldDefinitionDetail /> },
                      { path: "audit", element: <AuditList /> },
                      { path: "contract-templates", element: <ContractTemplatesList /> },
                      { path: "contract-templates/:id", element: <ContractTemplateDetail /> },
                      // Admin timesheet approvals (distinct from the contractor
                      // surface at /timesheet — singular).
                      { path: "timesheets", element: <TimesheetApprovals /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
