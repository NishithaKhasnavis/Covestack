import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotes, saveNotes, Note } from "../lib/notes";

export const useNotes = (workspaceId: string) =>
  useQuery({
    queryKey: ["notes", workspaceId],
    queryFn: async () => {
      const { note, etag } = await getNotes(workspaceId);
      return { note, etag };
    },
    enabled: !!workspaceId,
  });

export const useSaveNotes = (workspaceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { content: string; ifMatch?: string; version?: number }) => {
      return saveNotes(workspaceId, p.content, { ifMatch: p.ifMatch, version: p.version });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", workspaceId] }),
  });
};
