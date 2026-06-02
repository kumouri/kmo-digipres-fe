import type { ProjectAssignment } from "../types/api";
import type { CrmClient } from "./client";

// Project assignments: which team members are on a project, with optional
// per-project bill/cost rate overrides. All endpoints are ADMIN-gated
// server-side; the FE also gates the Team tab.

/** Body for POST /projects/{projectId}/assignments. */
export interface AssignmentInput {
  userId: string;
  billRateOverride?: number;
  costRateOverride?: number;
  role?: string;
}

export function listAssignments(
  client: CrmClient,
  projectId: string,
): Promise<ProjectAssignment[]> {
  return client.api<ProjectAssignment[]>(
    `/projects/${projectId}/assignments`,
  );
}

// The assignment POST is an @IdempotentRoute on the backend and REQUIRES an
// Idempotency-Key header (201 on first create, 200 if the same person is
// already assigned). Each click mints a fresh key — same mechanism the API
// client exposes for any header (init.headers), no special-casing needed.
export function createAssignment(
  client: CrmClient,
  projectId: string,
  body: AssignmentInput,
): Promise<ProjectAssignment> {
  return client.api<ProjectAssignment>(
    `/projects/${projectId}/assignments`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );
}

export function updateAssignment(
  client: CrmClient,
  projectId: string,
  id: string,
  body: AssignmentInput,
): Promise<ProjectAssignment> {
  return client.api<ProjectAssignment>(
    `/projects/${projectId}/assignments/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export function deleteAssignment(
  client: CrmClient,
  projectId: string,
  id: string,
): Promise<void> {
  return client.api<void>(`/projects/${projectId}/assignments/${id}`, {
    method: "DELETE",
  });
}
