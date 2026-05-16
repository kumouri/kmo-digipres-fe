import { useMemo } from "react";
import * as projectsApi from "../api/projects";
import { useCrmClient } from "../provider/CrmProvider";
import type { Project, Milestone, Task } from "../types/api";

export function useProjectsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Projects
      listProjects: () => projectsApi.listProjects(client),
      getProject: (id: string) => projectsApi.getProject(client, id),
      createProject: (body: Project) => projectsApi.createProject(client, body),
      updateProject: (id: string, body: Project) =>
        projectsApi.updateProject(client, id, body),
      deleteProject: (id: string) => projectsApi.deleteProject(client, id),
      changeProjectStatus: (id: string, target: string) =>
        projectsApi.changeProjectStatus(client, id, target),
      convertFromDeal: (dealId: string) =>
        projectsApi.convertFromDeal(client, dealId),
      // Milestones
      listMilestones: (projectId: string) =>
        projectsApi.listMilestones(client, projectId),
      createMilestone: (projectId: string, body: Milestone) =>
        projectsApi.createMilestone(client, projectId, body),
      getMilestone: (id: string) => projectsApi.getMilestone(client, id),
      updateMilestone: (id: string, body: Milestone) =>
        projectsApi.updateMilestone(client, id, body),
      deleteMilestone: (id: string) => projectsApi.deleteMilestone(client, id),
      completeMilestone: (id: string) =>
        projectsApi.completeMilestone(client, id),
      // Tasks
      listTasks: (projectId: string) => projectsApi.listTasks(client, projectId),
      createTask: (projectId: string, body: Task) =>
        projectsApi.createTask(client, projectId, body),
      updateTask: (id: string, body: Task) =>
        projectsApi.updateTask(client, id, body),
      deleteTask: (id: string) => projectsApi.deleteTask(client, id),
      changeTaskStatus: (id: string, target: string) =>
        projectsApi.changeTaskStatus(client, id, target),
    }),
    [client],
  );
}
