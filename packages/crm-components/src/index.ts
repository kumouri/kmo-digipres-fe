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
  TeamMemberForm,
  teamMemberToFormValues,
  formValuesToTeamMember,
  type TeamMemberFormValues,
} from "./admin/team";
export { useTeamApi } from "./hooks/useTeamApi";
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
