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
