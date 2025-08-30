import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, createTask, updateTask, deleteTask, Task } from "../lib/tasks";

export const useTasks = (workspaceId: string) =>
  useQuery({ queryKey: ["tasks", workspaceId], queryFn: () => listTasks(workspaceId), enabled: !!workspaceId });

export const useCreateTask = (workspaceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { title: string; status?: Task["status"]; due?: string }) => createTask(workspaceId, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
};

export const useUpdateTask = (workspaceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; patch: Partial<Pick<Task, "title" | "status" | "due">> }) =>
      updateTask(p.id, p.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
};

export const useDeleteTask = (workspaceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
};
