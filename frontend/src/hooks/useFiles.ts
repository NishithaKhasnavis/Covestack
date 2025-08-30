import { useMutation, useQuery } from "@tanstack/react-query";
import { uploadFile, getDownloadUrl, deleteFile } from "../lib/files";

export const useUploadFile = (workspaceId: string) =>
  useMutation({
    mutationFn: (file: File) => uploadFile(workspaceId, file),
  });

export const useFileDownloadUrl = (fileId: string) =>
  useQuery({
    queryKey: ["fileUrl", fileId],
    queryFn: () => getDownloadUrl(fileId),
    enabled: !!fileId,
  });

export const useDeleteFile = () =>
  useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
  });
