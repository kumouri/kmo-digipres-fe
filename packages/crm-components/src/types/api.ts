// Mirrors backend DTOs in repos/kmo-digipres-be/src/main/java/com/kumouri/kmodigipresbe/model/.
// When the backend's DTOs change, update this file. Keep field names identical.

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: string[];
}

export type UserStatus = "ACTIVE" | "DISABLED";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: string[];
  status: UserStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// --- Contacts ---------------------------------------------------------------

export type ContactType = "PERSON" | "ORG";

export interface PhoneNumber {
  number: string;
  label: string;
}

export interface PostalAddress {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  label: string;
}

export interface ContactDTO {
  id?: string;
  type?: ContactType;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  companyId?: string;
  emails?: string[];
  phones?: PhoneNumber[];
  addresses?: PostalAddress[];
  tags?: string[];
  ownerId?: string;
  customFields?: Record<string, unknown>;
}

// --- Companies --------------------------------------------------------------

export interface CompanyDTO {
  id?: string;
  name?: string;
  website?: string;
  industry?: string;
  addresses?: PostalAddress[];
  tags?: string[];
  ownerId?: string;
  customFields?: Record<string, unknown>;
}

// --- Deals ------------------------------------------------------------------

export type PipelineStage =
  | "NEW"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export const PIPELINE_STAGES: PipelineStage[] = [
  "NEW",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export interface DealDTO {
  id?: string;
  title?: string;
  stage?: PipelineStage;
  value?: number;
  currency?: string;
  expectedCloseDate?: string;
  primaryContactId?: string;
  companyId?: string;
  ownerId?: string;
  lostReason?: string;
  customFields?: Record<string, unknown>;
}

export interface MoveStageRequest {
  stage: PipelineStage;
  lostReason?: string;
}

// --- Activities -------------------------------------------------------------

export type ActivityType = "NOTE" | "EMAIL" | "CALL" | "MEETING" | "TASK";
export type ActivityDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";
export type SubjectType = "CONTACT" | "COMPANY" | "DEAL" | "WORK_ORDER";

export interface ActivityDTO {
  id?: string;
  type?: ActivityType;
  direction?: ActivityDirection;
  subjectType?: SubjectType;
  subjectId?: string;
  summary?: string;
  body?: string;
  occurredAt?: string;
  dueAt?: string;
  completedAt?: string;
  ownerId?: string;
  payload?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
}

export const ACTIVITY_TYPES: ActivityType[] = ["NOTE", "EMAIL", "CALL", "MEETING", "TASK"];
export const ACTIVITY_DIRECTIONS: ActivityDirection[] = ["INBOUND", "OUTBOUND", "INTERNAL"];
export const SUBJECT_TYPES: SubjectType[] = ["CONTACT", "COMPANY", "DEAL", "WORK_ORDER"];

// --- Communication ----------------------------------------------------------

export interface SingleEmailCommunicationDTO {
  to: string;
  from: string;
  subject: string;
  body: string;
}

// --- Public booking ---------------------------------------------------------

/** Public-facing projection of a BookingLink (mirrors BookingPublicView.java). */
export interface BookingPublicView {
  slug: string;
  title: string;
  description?: string;
  durationMinutes: number;
  timezone: string;
  /** ISO-8601 instants of bookable starts in the requested window. */
  availableSlots: string[];
}

/** Payload for POST /public/booking/{slug}/book (mirrors BookSlotRequest.java). */
export interface BookSlotRequest {
  /** ISO-8601 instant of the chosen slot's start. */
  slotStart: string;
  attendeeEmail: string;
  attendeeName: string;
  notes?: string;
}

/** Subset of Meeting returned by POST .../book. */
export interface BookedMeeting {
  id: string;
  tenantId: string;
  name?: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
}
