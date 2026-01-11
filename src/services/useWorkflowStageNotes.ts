import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

// Types for stage notes
export interface StageNote {
  id: string;
  workflow_id: string;
  stage_id: string;
  organization_id: string;
  employee_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
  replies?: StageNote[];
}

export interface StageAttachment {
  id: string;
  workflow_id: string;
  stage_id: string;
  organization_id: string;
  employee_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

// Fetch stage notes with employee info and nested replies
export function useStageNotes(workflowId: string | undefined, stageId: string | undefined) {
  return useQuery({
    queryKey: ["stage-notes", workflowId, stageId],
    queryFn: async () => {
      if (!workflowId || !stageId) return [];

      const { data, error } = await supabase
        .from("workflow_stage_notes")
        .select(`
          *,
          employee:employees!workflow_stage_notes_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("workflow_id", workflowId)
        .eq("stage_id", stageId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch replies for all notes
      const noteIds = data?.map(n => n.id) || [];
      if (noteIds.length === 0) return data || [];

      const { data: replies, error: repliesError } = await supabase
        .from("workflow_stage_notes")
        .select(`
          *,
          employee:employees!workflow_stage_notes_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .in("parent_id", noteIds)
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;

      // Nest replies under their parent notes
      const notesWithReplies = (data || []).map(note => ({
        ...note,
        replies: (replies || []).filter(r => r.parent_id === note.id)
      }));

      return notesWithReplies as StageNote[];
    },
    enabled: !!workflowId && !!stageId,
  });
}

// Get note counts per stage for a workflow
export function useStageNoteCounts(workflowId: string | undefined, stageIds: string[]) {
  // Create a stable key from the stageIds array
  const stageIdsKey = stageIds.join(',');
  
  return useQuery({
    queryKey: ["stage-note-counts", workflowId, stageIdsKey],
    queryFn: async () => {
      if (!workflowId || stageIds.length === 0) return {};

      const { data, error } = await supabase
        .from("workflow_stage_notes")
        .select("stage_id")
        .eq("workflow_id", workflowId)
        .in("stage_id", stageIds);

      if (error) throw error;

      // Count notes per stage
      const counts: Record<string, number> = {};
      (data || []).forEach(note => {
        counts[note.stage_id] = (counts[note.stage_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!workflowId && stageIds.length > 0,
  });
}

// Add a stage note
export function useAddStageNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      stageId,
      organizationId,
      employeeId,
      content,
      parentId,
      mentionedEmployeeIds,
    }: {
      workflowId: string;
      stageId: string;
      organizationId: string;
      employeeId: string;
      content: string;
      parentId?: string | null;
      mentionedEmployeeIds?: string[];
    }) => {
      // Insert note
      const { data: note, error } = await supabase
        .from("workflow_stage_notes")
        .insert({
          workflow_id: workflowId,
          stage_id: stageId,
          organization_id: organizationId,
          employee_id: employeeId,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert mentions if any
      if (mentionedEmployeeIds && mentionedEmployeeIds.length > 0) {
        const mentions = mentionedEmployeeIds.map(empId => ({
          note_id: note.id,
          mentioned_employee_id: empId,
          organization_id: organizationId,
        }));

        const { error: mentionError } = await supabase
          .from("workflow_stage_note_mentions")
          .insert(mentions);

        if (mentionError) console.error("Failed to insert mentions:", mentionError);
      }

      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stage-notes", variables.workflowId, variables.stageId] });
      queryClient.invalidateQueries({ queryKey: ["stage-note-counts", variables.workflowId] });
      toast.success(variables.parentId ? "Reply added" : "Note added");
    },
    onError: (error) => {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note");
    },
  });
}

// Update a stage note
export function useUpdateStageNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      content,
      workflowId,
      stageId,
    }: {
      noteId: string;
      content: string;
      workflowId: string;
      stageId: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_stage_notes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stage-notes", variables.workflowId, variables.stageId] });
      toast.success("Note updated");
    },
    onError: (error) => {
      console.error("Failed to update note:", error);
      toast.error("Failed to update note");
    },
  });
}

// Delete a stage note
export function useDeleteStageNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      workflowId,
      stageId,
    }: {
      noteId: string;
      workflowId: string;
      stageId: string;
    }) => {
      const { error } = await supabase
        .from("workflow_stage_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stage-notes", variables.workflowId, variables.stageId] });
      queryClient.invalidateQueries({ queryKey: ["stage-note-counts", variables.workflowId] });
      toast.success("Note deleted");
    },
    onError: (error) => {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    },
  });
}

// Fetch stage attachments
export function useStageAttachments(workflowId: string | undefined, stageId: string | undefined) {
  return useQuery({
    queryKey: ["stage-attachments", workflowId, stageId],
    queryFn: async () => {
      if (!workflowId || !stageId) return [];

      const { data, error } = await supabase
        .from("workflow_stage_attachments")
        .select(`
          *,
          employee:employees!workflow_stage_attachments_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("workflow_id", workflowId)
        .eq("stage_id", stageId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StageAttachment[];
    },
    enabled: !!workflowId && !!stageId,
  });
}

// Get attachment counts per stage
export function useStageAttachmentCounts(workflowId: string | undefined, stageIds: string[]) {
  // Create a stable key from the stageIds array
  const stageIdsKey = stageIds.join(',');
  
  return useQuery({
    queryKey: ["stage-attachment-counts", workflowId, stageIdsKey],
    queryFn: async () => {
      if (!workflowId || stageIds.length === 0) return {};

      const { data, error } = await supabase
        .from("workflow_stage_attachments")
        .select("stage_id")
        .eq("workflow_id", workflowId)
        .in("stage_id", stageIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(att => {
        counts[att.stage_id] = (counts[att.stage_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!workflowId && stageIds.length > 0,
  });
}

// Upload a stage attachment
export function useUploadStageAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      stageId,
      organizationId,
      employeeId,
      file,
    }: {
      workflowId: string;
      stageId: string;
      organizationId: string;
      employeeId: string;
      file: File;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/${workflowId}/${stageId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("workflow-stage-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert attachment record
      const { data, error } = await supabase
        .from("workflow_stage_attachments")
        .insert({
          workflow_id: workflowId,
          stage_id: stageId,
          organization_id: organizationId,
          employee_id: employeeId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stage-attachments", variables.workflowId, variables.stageId] });
      queryClient.invalidateQueries({ queryKey: ["stage-attachment-counts", variables.workflowId] });
      toast.success("File uploaded");
    },
    onError: (error) => {
      console.error("Failed to upload file:", error);
      toast.error("Failed to upload file");
    },
  });
}

// Delete a stage attachment
export function useDeleteStageAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      filePath,
      workflowId,
      stageId,
    }: {
      attachmentId: string;
      filePath: string;
      workflowId: string;
      stageId: string;
    }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("workflow-stage-attachments")
        .remove([filePath]);

      if (storageError) console.error("Failed to delete from storage:", storageError);

      // Delete record
      const { error } = await supabase
        .from("workflow_stage_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stage-attachments", variables.workflowId, variables.stageId] });
      queryClient.invalidateQueries({ queryKey: ["stage-attachment-counts", variables.workflowId] });
      toast.success("File deleted");
    },
    onError: (error) => {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    },
  });
}

// Real-time subscription for stage notes
export function useStageNotesRealtime(workflowId: string | undefined, stageId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workflowId || !stageId) return;

    const channel = supabase
      .channel(`stage-notes-${workflowId}-${stageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_stage_notes",
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stage-notes", workflowId, stageId] });
          queryClient.invalidateQueries({ queryKey: ["stage-note-counts", workflowId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_stage_attachments",
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stage-attachments", workflowId, stageId] });
          queryClient.invalidateQueries({ queryKey: ["stage-attachment-counts", workflowId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, stageId, queryClient]);
}

// Helper to get download URL for an attachment
export function getAttachmentUrl(filePath: string): string {
  const { data } = supabase.storage
    .from("workflow-stage-attachments")
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// Get signed URL for private download
export async function getSignedAttachmentUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("workflow-stage-attachments")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error("Failed to get signed URL:", error);
    return null;
  }
  
  return data.signedUrl;
}
