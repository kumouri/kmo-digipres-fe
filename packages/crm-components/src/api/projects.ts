import type { Project, Milestone, Task } from "../types/api";
import type { CrmClient } from "./client";

// --- Projects ----------------------------------------------------------------

export function listProjects(client: CrmClient): Promise<Project[]> {
  return client.api<Project[]>("/projects");
}

export function getProject(client: CrmClient, id: string): Promise<Project> {
  return client.api<Project>(`/projects/${id}`);
}

export function createProject(client: CrmClient, body: Project): Promise<Project> {
  return client.api<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateProject(
  client: CrmClient,
  id: string,
  body: Project,
): Promise<Project> {
  return client.api<Project>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteProject(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/projects/${id}`, { method: "DELETE" });
}

export function changeProjectStatus(
  client: CrmClient,
  id: string,
  target: string,
): Promise<Project> {
  return client.api<Project>(
    `/projects/${id}/status?target=${encodeURIComponent(target)}`,
    { method: "POST" },
  );
}

export function convertFromDeal(
  client: CrmClient,
  dealId: string,
): Promise<Project> {
  return client.api<Project>(`/projects/from-deal/${dealId}`, {
    method: "POST",
  });
}

// --- Milestones (sub-resource) -----------------------------------------------

export function listMilestones(
  client: CrmClient,
  projectId: string,
): Promise<Milestone[]> {
  return client.api<Milestone[]>(`/milestones/by-project/${projectId}`);
}

export function createMilestone(
  client: CrmClient,
  projectId: string,
  body: Milestone,
): Promise<Milestone> {
  return client.api<Milestone>(`/milestones/by-project/${projectId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMilestone(client: CrmClient, id: string): Promise<Milestone> {
  return client.api<Milestone>(`/milestones/${id}`);
}

export function updateMilestone(
  client: CrmClient,
  id: string,
  body: Milestone,
): Promise<Milestone> {
  return client.api<Milestone>(`/milestones/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteMilestone(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/milestones/${id}`, { method: "DELETE" });
}

export function completeMilestone(
  client: CrmClient,
  id: string,
): Promise<Milestone> {
  return client.api<Milestone>(
    `/milestones/${id}/transition?status=COMPLETED`,
    { method: "POST" },
  );
}

// --- Tasks (sub-resource) ----------------------------------------------------

export function listTasks(
  client: CrmClient,
  projectId: string,
): Promise<Task[]> {
  return client.api<Task[]>(`/tasks/by-project/${projectId}`);
}

export function createTask(
  client: CrmClient,
  projectId: string,
  body: Task,
): Promise<Task> {
  return client.api<Task>(`/tasks/by-project/${projectId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTask(
  client: CrmClient,
  id: string,
  body: Task,
): Promise<Task> {
  return client.api<Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteTask(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/tasks/${id}`, { method: "DELETE" });
}

export function changeTaskStatus(
  client: CrmClient,
  id: string,
  target: string,
): Promise<Task> {
  return client.api<Task>(
    `/tasks/${id}/status?target=${encodeURIComponent(target)}`,
    { method: "POST" },
  );
}
