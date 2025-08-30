import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listWorkspaces, createWorkspace, renameWorkspace, deleteWorkspace } from "../lib/workspaces";

export const useWorkspaces = () =>
  useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });

export const useCreateWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { name: string; description?: string }) => createWorkspace(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
};

export const useRenameWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; name: string }) => renameWorkspace(p.id, p.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
};

export const useDeleteWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
};
