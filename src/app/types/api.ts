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
