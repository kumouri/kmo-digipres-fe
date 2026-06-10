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
export { cn, safeHref } from "./primitives/utils";

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
// Home Services T5 "Instant Callback" — revenue-ranked callback dispatcher
// queue + recovery stats + config card. Hand-written client (the BE
// CallbackController is @ConditionalOnProperty-gated for both the home-services
// AND responder modules, so all routes are absent from the generated openapi
// types — the T4 SwitchboardController / T3 MidnightResponderController
// precedent).
export { CallbackQueue } from "./admin/home-services";
export { useHomeCallbackApi } from "./hooks/useHomeCallbackApi";
export type {
  CallbackCardDTO,
  CallbackRecoveryStats,
  CallbackConfig,
  CallbackConfigRequest,
} from "./api/home-callback";
// Home Services T8 "QuoteNow" — office quote-inbox (list + detail: attributes,
// price range, repair-vs-replace, status) + price-book config card + homeowner
// widget token-issue. Hand-written client (the BE QuoteInboxController,
// PriceBookController, and QuoteIntakeTokenController are
// @ConditionalOnProperty(kmosf.modules.quoting)-gated, so all routes are absent
// from the generated openapi types — the T5 CallbackController precedent).
export { QuoteInbox, PriceBookConfig } from "./admin/home-services";
export { useQuotingApi } from "./hooks/useQuotingApi";
export type {
  QuoteStatus,
  Recommendation,
  AttributeSource,
  JobKind,
  QuoteInboxCard,
  QuoteResponse,
  PriceBookLineItem,
  PriceBook,
} from "./api/quoting";
// ChairFill — salon flagship (CF-5) — three staff surfaces: the no-show risk
// view, the gap-fill waitlist board, and the salon review inbox (reuses the
// shared review-replies queue + adds a paste-in). Hand-written client (the BE
// routes are @ConditionalOnProperty-gated, so they are absent from the
// generated openapi types — the HS-4 precedent).
export {
  NoShowRiskView,
  WaitlistBoard,
  SalonReviewInbox,
  ReviewBoostBoard,
  StyleConsultInbox,
} from "./admin/chairfill";
export { useChairFillApi } from "./hooks/useChairFillApi";
// Salon "ReviewBoost" (T6) — per-stylist review-insights board + config status
// card. Hand-written client (the BE ReviewBoostController is
// @ConditionalOnProperty-gated for both the chairfill AND salon-spa modules,
// so all routes are absent from the generated openapi types — the T4
// SwitchboardController / T3 MidnightResponderController precedent). Read-only
// surface: GET /chairfill/reviewboost/insights + GET /chairfill/reviewboost/config.
// There is NO write endpoint — T6 mints no config model.
export { useSalonReviewBoostApi } from "./hooks/useSalonReviewBoostApi";
export type {
  SalonReviewBoard,
  StylistReviewStats,
  ReviewBoostConfig,
} from "./api/salon-reviewboost";
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
// Real Estate Concierge (T10 — Listing Prep Studio): per-listing generate
// (MLS description + 4-week dated social calendar + email campaign) → Fair-
// Housing lint panel (flagged calendar posts are held + safe-substituted, never
// emitted) → Approve / Skip queue. Hand-written client (the BE
// ListingPrepController is @ConditionalOnProperty(kmosf.modules.realestate)
// -gated, so all routes are absent from the generated openapi types — the RE-5b
// / ChairFill / HS-4 precedent). No @IdempotentRoute on generate.
export { ListingPrepStudio } from "./admin/realestate";
export { useListingPrepApi } from "./hooks/useListingPrepApi";
export type {
  PrepPackStatus,
  SocialPost,
  PhotoNote,
  PrepFairHousingFlag,
  ListingPrepPack,
  ListingPrepGenerateRequest,
} from "./api/listing-prep";
// Real Estate "Database Goldmine" (T1) — the dormant-lead nurture funnel
// dashboard: pick a reactivation campaign, segment-and-enroll dormant leads,
// watch the per-segment funnel fill (enrolled → nudged → replied → booked).
// Hand-written client (the BE RE-nurture + shared nurture routes are
// @ConditionalOnProperty-gated, so they are absent from the generated openapi
// types — the Real Estate RE-5b / AR / proposals precedent).
export { NurtureDashboard } from "./admin/realestate";
export { useRealEstateNurtureApi } from "./hooks/useRealEstateNurtureApi";
export type {
  DormancyBucket,
  NurtureEnrollmentStatus,
  NurtureSegmentCounts,
  NurtureCampaignAnalytics,
  SegmentationResult,
  NurtureCampaign,
  NurtureSegmentDefinition,
} from "./api/realestate-nurture";
// Real Estate "Midnight Responder" (T3) — the response-latency stats panel
// (the "<30 s, 24/7" headline) + tier-routing config card (warm/cold nurture-
// campaign mapping). Hand-written client (the BE controllers are
// @ConditionalOnProperty-gated for both the realestate AND responder modules,
// so they are absent from the generated openapi types — the T1 / AR /
// proposals precedent).
export { MidnightResponderPanel } from "./admin/realestate";
export { useRealEstateResponderApi } from "./hooks/useRealEstateResponderApi";
export type {
  MidnightResponderConfig,
  MidnightResponderConfigDTO,
  MidnightResponderLatencyStats,
} from "./api/realestate-responder";
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
  RevenueReviveDashboard,
  SwitchboardPanel,
} from "./admin/frontdesk";
export { useFrontDeskApi } from "./hooks/useFrontDeskApi";
// Health "Switchboard AI" (T4) — logistics config card + call-deflection stats.
// Hand-written client (the BE routes are @ConditionalOnProperty-gated for both
// the frontdesk AND responder modules, so they are absent from the generated
// openapi types — the T3 Midnight Responder / T2 RevenueRevive precedent).
// PHI-free by construction: config holds only logistics answers (hours,
// location, booking/reschedule instructions, links) — no clinical content.
export { useFrontDeskSwitchboardApi } from "./hooks/useFrontDeskSwitchboardApi";
export type {
  SwitchboardConfig,
  SwitchboardConfigRequest,
  SwitchboardDeflectionStats,
} from "./api/frontdesk-switchboard";
// Health "RescheduleFlow" (T7) — waitlist board + fill-rate stats. Hand-written
// client (the BE RescheduleController is @ConditionalOnProperty(frontdesk)-gated
// AND requires the waitlist module, so all routes are absent from the generated
// openapi types — the T4 SwitchboardPanel / T5 CallbackQueue precedent).
// PHI-free by construction (fence F1): logistics-only — provider + time window +
// show-likelihood signals; no diagnosis, procedure, or clinical field.
export { RescheduleBoard } from "./admin/frontdesk";
export { useRescheduleApi } from "./hooks/useRescheduleApi";
export type {
  WaitlistEntry,
  WaitlistEntryStatus,
  WaitlistJoinRequest,
  RescheduleFillStats,
} from "./api/reschedule";
// Health "RevenueRevive" (T2) — dormant-patient reactivation funnel. Hand-written
// client (the BE routes are @ConditionalOnProperty(frontdesk)-gated AND the
// shared nurture controller is nurture-module-gated, so both are absent from the
// generated openapi types — the T1 RE NurtureDashboard precedent). PHI-free by
// construction: segments on logistics signals only.
export { useFrontDeskNurtureApi } from "./hooks/useFrontDeskNurtureApi";
export type {
  FdDormancyBucket,
  FdNurtureEnrollmentStatus,
  FdNurtureCampaignAnalytics,
  FdNurtureSegmentCounts,
  FdSegmentationResult,
  FdNurtureCampaign,
  FdNurtureSegmentDefinition,
} from "./api/frontdesk-nurture";
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
// Proposals / SOW Studio — AI-drafted priced SOW from discovery notes. Hand-
// written client (the BE routes are @ConditionalOnProperty-gated, so they are
// absent from the generated openapi types — the AR / FrontDesk / ChairFill
// precedent).
export { ProposalStudio } from "./admin/proposals";
export { useProposalsApi } from "./hooks/useProposalsApi";
export type {
  ProposalDraftResult,
  ProposalDraftRequest,
  SowDraft,
} from "./api/proposals";
// Salon T9 "StyleConsult AI" — staff consult inbox (assessment + service recs +
// margin-ranked retail recs + "stylist will confirm" guardrail + booking status),
// retail-attach analytics panel, and consult-widget token-issue. Hand-written
// client (the BE StyleConsultController and StyleConsultTokenController are
// @ConditionalOnProperty(kmosf.modules.chairfill)-gated, so all routes are
// absent from the generated openapi types — the T8 QuoteNow / T6 ReviewBoost
// precedent).
export { useStyleConsultApi } from "./hooks/useStyleConsultApi";
export type {
  StyleConsultStatus,
  StyleAttributeSource,
  StyleConsultInboxCard,
  ServiceRecommendation,
  RetailRecommendation,
  StyleConsultResponse,
  StyleConsultAnalytics,
} from "./api/styleconsult";
// Home Services T11 "QuoteCloser" — follow-up config card (window / cadence
// toggle / financing-nudge copy) + recovery-funnel analytics panel (quotes
// sent → followed-up → recovered → review-requested + recovery rate). Hand-
// written client (both the QuoteCloserConfigController and
// QuoteCloserController are @ConditionalOnProperty(kmosf.modules.quoting)
// -gated AND require the nurture module, so all routes are absent from the
// generated openapi types — the T8 PriceBookConfig / T5 CallbackController
// precedent).
export { QuoteCloserSettings } from "./admin/home-services";
export { useQuoteCloserApi } from "./hooks/useQuoteCloserApi";
export type {
  QuoteCloserConfigDTO,
  QuoteCloserAnalytics,
} from "./api/quote-closer";
