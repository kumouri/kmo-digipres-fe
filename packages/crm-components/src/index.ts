// API client + provider
export {
  ApiError,
  createCrmClient,
  type CrmClient,
  type CrmClientConfig,
} from "./api/client";
export {
  CrmProvider,
  useCrmClient,
  type CrmProviderProps,
} from "./provider/CrmProvider";

// Backend DTO mirrors
export * from "./types/api";

// Primitives (shadcn-style)
export * from "./primitives/alert-dialog";
export * from "./primitives/badge";
export * from "./primitives/button";
export * from "./primitives/card";
export * from "./primitives/dialog";
export * from "./primitives/dropdown-menu";
export * from "./primitives/input";
export * from "./primitives/label";
export * from "./primitives/select";
export * from "./primitives/skeleton";
export * from "./primitives/table";
export * from "./primitives/tabs";
export * from "./primitives/textarea";
export { cn } from "./primitives/utils";

// Generic components
export { DataTable, type Column } from "./components/DataTable";

// Hooks — TanStack Query-friendly wrappers over the API fetchers, bound to
// the configured CrmClient via useCrmClient().
export { useContactsApi } from "./hooks/useContactsApi";
export { useCompaniesApi } from "./hooks/useCompaniesApi";
export { useDealsApi } from "./hooks/useDealsApi";
export { useActivitiesApi } from "./hooks/useActivitiesApi";
export { useCommunicationApi } from "./hooks/useCommunicationApi";

// Public widgets — standalone, no CrmProvider / Router required.
export {
  BookingWidget,
  type BookingWidgetProps,
} from "./public/BookingWidget";
export {
  PublicContactForm,
  type PublicContactFormProps,
  type PublicContactFormValues,
} from "./public/PublicContactForm";
export {
  PublicBookingError,
  bookSlot,
  fetchBookingView,
} from "./api/public-booking";

// Admin views (require <CrmProvider> + a React Router context).
export {
  ContactsList,
  ContactDetail,
  ContactForm,
  contactToFormValues,
  formValuesToContact,
  type ContactDetailProps,
} from "./admin/contacts";
export {
  CompaniesList,
  CompanyDetail,
  CompanyForm,
  companyToFormValues,
  formValuesToCompany,
} from "./admin/companies";
export {
  DealsList,
  DealDetail,
  DealForm,
  DealsPipeline,
  dealToFormValues,
  formValuesToDeal,
} from "./admin/deals";
export {
  ActivitiesList,
  ActivityDetail,
  ActivityForm,
  activityToFormValues,
  formValuesToActivity,
} from "./admin/activities";
export { QuotesList, QuoteDetail } from "./admin/quotes";
export { useQuotesApi } from "./hooks/useQuotesApi";
export { InvoicesList, InvoiceDetail } from "./admin/invoices";
export { useInvoicesApi } from "./hooks/useInvoicesApi";
export { TicketsList, TicketDetail } from "./admin/tickets";
export { useTicketsApi } from "./hooks/useTicketsApi";
export { KnowledgeBaseList, KnowledgeBaseDetail } from "./admin/knowledge-base";
export { useKnowledgeBaseApi } from "./hooks/useKnowledgeBaseApi";
export { InboxList, InboxDetail } from "./admin/inbox";
export { useInboxApi } from "./hooks/useInboxApi";
export { FieldDefinitionsList, FieldDefinitionDetail } from "./admin/field-definitions";
export { useFieldDefinitionsApi } from "./hooks/useFieldDefinitionsApi";
export { AuditList } from "./admin/audit";
export { useAuditApi } from "./hooks/useAuditApi";
export { ReportsList, ReportDetail, DashboardsList, DashboardDetail } from "./admin/reports";
export { useReportsApi } from "./hooks/useReportsApi";
export { AskAiDialog } from "./admin/ai";
export { useAiApi } from "./hooks/useAiApi";
export { ProjectsList, ProjectDetail, ProjectAssignments, ContractorTaskList } from "./admin/projects";
export { useProjectsApi } from "./hooks/useProjectsApi";
export { useProjectAssignmentsApi } from "./hooks/useProjectAssignmentsApi";
export type { AssignmentInput } from "./api/project-assignments";
// Contractor self-service surface (/me/contractor/**) — used by the shared
// My Projects / My Timesheet / My Expenses pages when the user is a contractor.
export { useContractorApi } from "./hooks/useContractorApi";
export type {
  ContractorProjectView,
  ContractorTaskView,
  ContractorClientView,
} from "./api/contractor";
export {
  TeamList,
  TeamDetail,
  PayoutSummary,
  TeamMemberForm,
  teamMemberToFormValues,
  formValuesToTeamMember,
  type TeamMemberFormValues,
} from "./admin/team";
export { useTeamApi } from "./hooks/useTeamApi";
export { usePayoutsApi } from "./hooks/usePayoutsApi";
export { TimesheetPage, TimesheetApprovals, ExpensesList, ExpenseDetail, TimerWidget } from "./admin/time-and-expenses";
export { useTimeExpensesApi } from "./hooks/useTimeExpensesApi";
export { useTimesheetsApi } from "./hooks/useTimesheetsApi";
export { ContractsList, ContractDetail, ContractForm, contractToFormValues, formValuesToContract, type ContractFormValues } from "./admin/contracts";
export { useContractsApi } from "./hooks/useContractsApi";
export { ContractTemplatesList, ContractTemplateDetail, ContractTemplateForm, templateToFormValues, formValuesToTemplate, type ContractTemplateFormValues } from "./admin/contract-templates";
export { useContractTemplatesApi } from "./hooks/useContractTemplatesApi";
export {
  RecurringInvoicesList,
  RecurringInvoiceDetail,
  RecurringInvoiceForm,
  recurringInvoiceToFormValues,
  formValuesToRecurringInvoice,
  type RecurringInvoiceFormValues,
} from "./admin/recurring-invoices";
export { useRecurringInvoicesApi } from "./hooks/useRecurringInvoicesApi";
export { ReviewRepliesList } from "./admin/review-replies";
export { useReviewRepliesApi } from "./hooks/useReviewRepliesApi";
// Home Services — "Front Desk That Never Sleeps" — Missed-Call Inbox (HS-4).
// Hand-written client (the BE routes are @ConditionalOnProperty-gated, so they
// are absent from the generated openapi types).
export { MissedCallInbox } from "./admin/home-services";
export { useHomeServicesApi } from "./hooks/useHomeServicesApi";
// ChairFill — salon flagship (CF-5) — three staff surfaces: the no-show risk
// view, the gap-fill waitlist board, and the salon review inbox (reuses the
// shared review-replies queue + adds a paste-in). Hand-written client (the BE
// routes are @ConditionalOnProperty-gated, so they are absent from the
// generated openapi types — the HS-4 precedent).
export {
  NoShowRiskView,
  WaitlistBoard,
  SalonReviewInbox,
} from "./admin/chairfill";
export { useChairFillApi } from "./hooks/useChairFillApi";
// Real Estate Concierge — flagship (RE-5b) — four staff surfaces: the listing
// console (list + detail with disclosures, photos, generate marketing), the
// concierge inbox + lead pipeline, the transcript + citation viewer, and the
// marketing review queue (draft→approve, never auto-published). Hand-written
// client (the BE routes are @ConditionalOnProperty-gated, so they are absent
// from the generated openapi types — the ChairFill CF-5b / HS-4 precedent).
export {
  ListingConsole,
  ListingDetail,
  ConciergeInbox,
  ConciergeTranscript,
  MarketingReviewQueue,
} from "./admin/realestate";
export { useRealEstateApi } from "./hooks/useRealEstateApi";
// FrontDesk IQ — Health Practices flagship (FD-5b) — five staff surfaces: the
// risk-sorted day view, the recall board, the callback inbox (logistics only,
// never a transcript — fence F2), the HIPAA-safe review inbox (the signature
// demo: paste a review → a HIPAA-safe draft with the lint flags surfaced →
// approve copy-ready / skip), and the appointment console (create/list to seed
// the demo). Hand-written client (the BE routes are @ConditionalOnProperty-
// gated, so they are absent from the generated openapi types — the Real Estate
// RE-5b / ChairFill CF-5b / HS-4 precedent).
export {
  RiskDayView,
  RecallBoard,
  CallbackInbox,
  ReviewInbox,
  AppointmentConsole,
} from "./admin/frontdesk";
export { useFrontDeskApi } from "./hooks/useFrontDeskApi";
// AR — Accounts Receivable / Collections module — aging dashboard + promise-to-
// pay. Hand-written client (the BE routes are @ConditionalOnProperty-gated, so
// they are absent from the generated openapi types — the FrontDesk FD-5b /
// ChairFill CF-5b / HS-4 precedent).
export { ArAgingDashboard } from "./admin/ar";
export { useArApi } from "./hooks/useArApi";
export type {
  ArAgingReport,
  ArAgingBucket,
  ArAgingBucketLabel,
  PromiseToPay,
  PromiseToPayStatus,
  RecordPromiseRequest,
} from "./api/ar";
