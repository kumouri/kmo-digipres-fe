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
