/**
 * Social Feed Service Hooks
 * Unified hooks for the new posts system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useToast } from '@/hooks/use-toast';

export type PostType = 'win' | 'kudos' | 'announcement' | 'social' | 'executive_message';

export interface Post {
  id: string;
  organization_id: string;
  employee_id: string;
  post_type: PostType;
  content: string;
  kudos_recipient_ids: string[];
  access_scope: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by: string | null;
  scheduled_at: string | null;
  is_published: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  post_media?: {
    id: string;
    media_type: string;
    file_url: string;
    thumbnail_url: string | null;
  }[];
  post_mentions?: {
    id: string;
    employee_id: string;
    employee: {
      id: string;
      profiles: {
        full_name: string;
        avatar_url: string | null;
      };
    };
  }[];
  post_offices?: { office: { name: string } }[];
  post_departments?: { department: string }[];
  post_projects?: { project: { name: string } }[];
  post_polls?: {
    id: string;
    question: string;
    allow_multiple: boolean;
    ends_at: string | null;
    is_anonymous: boolean;
    poll_options: {
      id: string;
      option_text: string;
      sort_order: number;
    }[];
  }[];
  kudos_recipients?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }[];
}

export interface CreatePostInput {
  post_type: PostType;
  content: string;
  kudos_recipient_ids?: string[];
  access_scope?: string;
  scheduled_at?: string | null;
  media_files?: File[];
  mention_ids?: string[];
  office_ids?: string[];
  departments?: string[];
  project_ids?: string[];
  poll?: {
    question: string;
    options: string[];
    allow_multiple?: boolean;
    ends_at?: string | null;
    is_anonymous?: boolean;
  };
}

export const usePosts = (filter?: PostType | 'all') => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['social-feed-posts', currentOrg?.id, filter],
    queryFn: async (): Promise<Post[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('posts')
        .select(`
          *,
          employee:employees!posts_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          ),
          post_media(*),
          post_mentions(
            id,
            employee_id,
            employee:employees!post_mentions_employee_id_fkey(
              id,
              profiles!inner(full_name, avatar_url)
            )
          ),
          post_offices(office:offices(name)),
          post_departments(department),
          post_projects(project:projects(name)),
          post_polls(
            id,
            question,
            allow_multiple,
            ends_at,
            is_anonymous,
            poll_options(id, option_text, sort_order)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('is_deleted', false)
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (filter && filter !== 'all') {
        query = query.eq('post_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch kudos recipients if there are any kudos posts
      const posts = data as Post[];
      const kudosPosts = posts.filter(p => p.post_type === 'kudos' && p.kudos_recipient_ids?.length > 0);
      
      if (kudosPosts.length > 0) {
        const allRecipientIds = kudosPosts.flatMap(p => p.kudos_recipient_ids);
        const uniqueIds = [...new Set(allRecipientIds)];
        
        const { data: recipients } = await supabase
          .from('employees')
          .select('id, profiles!inner(full_name, avatar_url)')
          .in('id', uniqueIds);
        
        if (recipients) {
          const recipientMap = new Map(recipients.map(r => [r.id, r]));
          posts.forEach(post => {
            if (post.post_type === 'kudos' && post.kudos_recipient_ids?.length > 0) {
              post.kudos_recipients = post.kudos_recipient_ids
                .map(id => recipientMap.get(id))
                .filter(Boolean) as Post['kudos_recipients'];
            }
          });
        }
      }

      return posts;
    },
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000,
  });
};

export const useCreatePost = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Must be logged in with an employee profile');
      }

      // Validate kudos recipients
      if (input.post_type === 'kudos' && (!input.kudos_recipient_ids || input.kudos_recipient_ids.length === 0)) {
        throw new Error('Kudos must have at least one recipient');
      }

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          organization_id: currentOrg.id,
          employee_id: currentEmployee.id,
          post_type: input.post_type,
          content: input.content,
          kudos_recipient_ids: input.kudos_recipient_ids || [],
          access_scope: input.access_scope || 'company',
          scheduled_at: input.scheduled_at,
          is_published: !input.scheduled_at,
        })
        .select('id')
        .single();

      if (postError) throw postError;

      // Upload media files if any
      if (input.media_files && input.media_files.length > 0) {
        for (let i = 0; i < input.media_files.length; i++) {
          const file = input.media_files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentEmployee.id}/${post.id}/${Date.now()}_${i}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
          
          await supabase.from('post_media').insert({
            post_id: post.id,
            organization_id: currentOrg.id,
            media_type: mediaType,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            sort_order: i,
          });
        }
      }

      // Insert mentions
      if (input.mention_ids && input.mention_ids.length > 0) {
        await supabase.from('post_mentions').insert(
          input.mention_ids.map(employeeId => ({
            post_id: post.id,
            employee_id: employeeId,
            organization_id: currentOrg.id,
          }))
        );
      }

      // Insert visibility scopes
      if (input.access_scope === 'offices' && input.office_ids?.length) {
        await supabase.from('post_offices').insert(
          input.office_ids.map(officeId => ({
            post_id: post.id,
            office_id: officeId,
            organization_id: currentOrg.id,
          }))
        );
      }

      if (input.access_scope === 'departments' && input.departments?.length) {
        await supabase.from('post_departments').insert(
          input.departments.map(department => ({
            post_id: post.id,
            department,
            organization_id: currentOrg.id,
          }))
        );
      }

      if (input.access_scope === 'projects' && input.project_ids?.length) {
        await supabase.from('post_projects').insert(
          input.project_ids.map(projectId => ({
            post_id: post.id,
            project_id: projectId,
            organization_id: currentOrg.id,
          }))
        );
      }

      // Create poll if provided
      if (input.poll) {
        const { data: poll, error: pollError } = await supabase
          .from('post_polls')
          .insert({
            post_id: post.id,
            organization_id: currentOrg.id,
            question: input.poll.question,
            allow_multiple: input.poll.allow_multiple || false,
            ends_at: input.poll.ends_at,
            is_anonymous: input.poll.is_anonymous || false,
          })
          .select('id')
          .single();

        if (!pollError && poll) {
          await supabase.from('poll_options').insert(
            input.poll.options.map((option, index) => ({
              poll_id: poll.id,
              organization_id: currentOrg.id,
              option_text: option,
              sort_order: index,
            }))
          );
        }
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      toast({
        title: 'Posted! 🎉',
        description: 'Your post has been shared with the team',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      toast({
        title: 'Post deleted',
        description: 'The post has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useTogglePinPost = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, isPinned }: { postId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('posts')
        .update({
          is_pinned: isPinned,
          pinned_at: isPinned ? new Date().toISOString() : null,
          pinned_by: isPinned ? currentEmployee?.id : null,
        })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: (_, { isPinned }) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      toast({
        title: isPinned ? 'Post pinned' : 'Post unpinned',
        description: isPinned ? 'This post will appear at the top' : 'Post has been unpinned',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============================================
// UPDATE POST
// ============================================

export interface UpdatePostInput {
  postId: string;
  content: string;
  access_scope?: string;
  office_ids?: string[];
  departments?: string[];
  project_ids?: string[];
  kudos_recipient_ids?: string[];
  // Media operations
  newMediaFiles?: File[];
  removedMediaIds?: string[];
  removedMediaUrls?: string[];
  // Poll operations
  poll?: {
    question: string;
    options: { id?: string; text: string }[];
    allow_multiple: boolean;
  };
  existingPollId?: string | null;
  removedOptionIds?: string[];
}

export const useUpdatePost = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdatePostInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Must be logged in');
      }

      const warnings: string[] = [];

      // 1. UPDATE POST RECORD
      const { error: postError } = await supabase
        .from('posts')
        .update({
          content: input.content,
          access_scope: input.access_scope || 'company',
          kudos_recipient_ids: input.kudos_recipient_ids || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.postId);

      if (postError) throw new Error(`Post update failed: ${postError.message}`);

      // 2. HANDLE REMOVED MEDIA (with storage cleanup)
      if (input.removedMediaIds?.length && input.removedMediaUrls?.length) {
        for (let i = 0; i < input.removedMediaIds.length; i++) {
          const mediaId = input.removedMediaIds[i];
          const fileUrl = input.removedMediaUrls[i];

          if (fileUrl) {
            try {
              // Extract file path from URL for storage deletion
              const urlParts = fileUrl.split('/post-media/');
              if (urlParts[1]) {
                const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
                await supabase.storage.from('post-media').remove([filePath]);
              }
            } catch (e) {
              warnings.push(`Failed to remove media file from storage`);
            }
          }

          // Delete from database
          const { error: deleteError } = await supabase
            .from('post_media')
            .delete()
            .eq('id', mediaId);

          if (deleteError) {
            warnings.push(`Failed to remove media record`);
          }
        }
      }

      // 3. UPLOAD NEW MEDIA FILES
      if (input.newMediaFiles?.length) {
        for (let i = 0; i < input.newMediaFiles.length; i++) {
          const file = input.newMediaFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentEmployee.id}/${input.postId}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(fileName, file);

          if (uploadError) {
            warnings.push(`Failed to upload ${file.name}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

          await supabase.from('post_media').insert({
            post_id: input.postId,
            organization_id: currentOrg.id,
            media_type: mediaType,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            sort_order: i,
          });
        }
      }

      // 4. UPDATE VISIBILITY SCOPES
      // Delete old scope associations
      await supabase.from('post_offices').delete().eq('post_id', input.postId);
      await supabase.from('post_departments').delete().eq('post_id', input.postId);
      await supabase.from('post_projects').delete().eq('post_id', input.postId);

      // Insert new scope associations
      if (input.access_scope === 'offices' && input.office_ids?.length) {
        await supabase.from('post_offices').insert(
          input.office_ids.map(officeId => ({
            post_id: input.postId,
            office_id: officeId,
            organization_id: currentOrg.id,
          }))
        );
      }

      if (input.access_scope === 'departments' && input.departments?.length) {
        await supabase.from('post_departments').insert(
          input.departments.map(department => ({
            post_id: input.postId,
            department,
            organization_id: currentOrg.id,
          }))
        );
      }

      if (input.access_scope === 'projects' && input.project_ids?.length) {
        await supabase.from('post_projects').insert(
          input.project_ids.map(projectId => ({
            post_id: input.postId,
            project_id: projectId,
            organization_id: currentOrg.id,
          }))
        );
      }

      // 5. UPDATE POLL (with vote protection)
      if (input.existingPollId && input.poll) {
        // Update poll question and settings
        await supabase.from('post_polls').update({
          question: input.poll.question,
          allow_multiple: input.poll.allow_multiple,
        }).eq('id', input.existingPollId);

        // Handle poll options
        for (const option of input.poll.options) {
          if (option.id) {
            // Update existing option text
            await supabase.from('poll_options').update({
              option_text: option.text,
            }).eq('id', option.id);
          } else {
            // Add new option
            const maxSortOrder = input.poll.options
              .filter(o => o.id)
              .length;
            
            await supabase.from('poll_options').insert({
              poll_id: input.existingPollId,
              organization_id: currentOrg.id,
              option_text: option.text,
              sort_order: maxSortOrder + input.poll.options.indexOf(option),
            });
          }
        }

        // Delete removed options (only if they have no votes)
        if (input.removedOptionIds?.length) {
          for (const optionId of input.removedOptionIds) {
            // Check for votes first
            const { count } = await supabase
              .from('poll_votes')
              .select('*', { count: 'exact', head: true })
              .eq('option_id', optionId);

            if (count === 0) {
              await supabase.from('poll_options').delete().eq('id', optionId);
            } else {
              warnings.push(`Cannot delete option with ${count} vote(s)`);
            }
          }
        }
      }

      return { success: true, warnings };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-feed'] });

      if (result.warnings.length > 0) {
        toast({
          title: 'Post updated with warnings',
          description: result.warnings.join('; '),
        });
      } else {
        toast({ title: 'Post updated' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

// ============================================
// POLL HOOKS
// ============================================

interface PollVote {
  option_id: string;
  employee_id: string;
}

export const usePollVotes = (pollId: string) => {
  return useQuery({
    queryKey: ['poll-votes', pollId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_votes')
        .select('option_id, employee_id')
        .eq('poll_id', pollId);

      if (error) throw error;
      return data as PollVote[];
    },
    enabled: !!pollId,
  });
};

export const usePollVote = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pollId, optionIds }: { pollId: string; optionIds: string[] }) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Must be logged in');

      // Delete existing votes
      await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('employee_id', currentEmployee.id);

      // Insert new votes
      if (optionIds.length > 0) {
        const { error } = await supabase.from('poll_votes').insert(
          optionIds.map(optionId => ({
            poll_id: pollId,
            option_id: optionId,
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: ['poll-votes', pollId] });
      toast({ title: 'Vote recorded', description: 'Your vote has been submitted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit vote', variant: 'destructive' });
    },
  });
};

// ============================================
// COMMENT HOOKS
// ============================================

export interface Comment {
  id: string;
  content: string;
  employee_id: string;
  parent_comment_id: string | null;
  created_at: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          employee_id,
          parent_comment_id,
          created_at,
          employee:employees!post_comments_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Must be logged in');

      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        content,
      });

      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase
        .from('post_comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (error) throw error;
      return { postId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', data.postId] });
      toast({ title: 'Comment deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    },
  });
};

// ============================================
// REACTION HOOKS
// ============================================

export interface Reaction {
  id: string;
  emoji: string;
  employee_id: string;
}

export const EMOJI_OPTIONS = ['👍', '❤️', '🎉', '👏', '🔥', '💯', '😂', '🤔'];

export const usePostReactions = (postId: string) => {
  return useQuery({
    queryKey: ['post-reactions', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('id, emoji, employee_id')
        .eq('post_id', postId);

      if (error) throw error;
      return data as Reaction[];
    },
    enabled: !!postId,
  });
};

export const useTogglePostReaction = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, emoji, existingReactions }: { 
      postId: string; 
      emoji: string; 
      existingReactions: Reaction[];
    }) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Must be logged in');

      const existingReaction = existingReactions.find(
        r => r.emoji === emoji && r.employee_id === currentEmployee.id
      );

      if (existingReaction) {
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_reactions').insert({
          post_id: postId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          emoji,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
    },
  });
};

// ============================================
// EMPLOYEE FEED HOOK
// ============================================

export const useEmployeeFeed = (employeeId: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['employee-feed', currentOrg?.id, employeeId],
    queryFn: async (): Promise<Post[]> => {
      if (!currentOrg?.id || !employeeId) return [];

      // Get posts created by employee
      const { data: createdPosts, error: createdError } = await supabase
        .from('posts')
        .select(`
          *,
          employee:employees!posts_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          ),
          post_media(*),
          post_mentions(
            id,
            employee_id,
            employee:employees!post_mentions_employee_id_fkey(
              id,
              profiles!inner(full_name, avatar_url)
            )
          ),
          post_offices(office:offices(name)),
          post_departments(department),
          post_projects(project:projects(name)),
          post_polls(
            id,
            question,
            allow_multiple,
            ends_at,
            is_anonymous,
            poll_options(id, option_text, sort_order)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', employeeId)
        .eq('is_deleted', false)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;

      // Get posts where employee is mentioned
      const { data: mentionedPostIds } = await supabase
        .from('post_mentions')
        .select('post_id')
        .eq('employee_id', employeeId);

      let mentionedPosts: Post[] = [];
      if (mentionedPostIds && mentionedPostIds.length > 0) {
        const ids = mentionedPostIds.map(m => m.post_id);
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            employee:employees!posts_employee_id_fkey(
              id,
              profiles!inner(full_name, avatar_url)
            ),
            post_media(*),
            post_mentions(
              id,
              employee_id,
              employee:employees!post_mentions_employee_id_fkey(
                id,
                profiles!inner(full_name, avatar_url)
              )
            ),
            post_offices(office:offices(name)),
            post_departments(department),
            post_projects(project:projects(name)),
            post_polls(
              id,
              question,
              allow_multiple,
              ends_at,
              is_anonymous,
              poll_options(id, option_text, sort_order)
            )
          `)
          .eq('organization_id', currentOrg.id)
          .eq('is_deleted', false)
          .eq('is_published', true)
          .in('id', ids);

        if (!error && data) mentionedPosts = data as Post[];
      }

      // Get kudos posts where employee is a recipient
      const { data: kudosPostsData } = await supabase
        .from('posts')
        .select(`
          *,
          employee:employees!posts_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          ),
          post_media(*),
          post_mentions(
            id,
            employee_id,
            employee:employees!post_mentions_employee_id_fkey(
              id,
              profiles!inner(full_name, avatar_url)
            )
          ),
          post_offices(office:offices(name)),
          post_departments(department),
          post_projects(project:projects(name)),
          post_polls(
            id,
            question,
            allow_multiple,
            ends_at,
            is_anonymous,
            poll_options(id, option_text, sort_order)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('post_type', 'kudos')
        .eq('is_deleted', false)
        .eq('is_published', true)
        .contains('kudos_recipient_ids', [employeeId]);

      const kudosPosts = kudosPostsData as Post[] || [];

      // Combine and deduplicate
      const allPosts = [...(createdPosts as Post[]), ...mentionedPosts, ...kudosPosts];
      const uniquePosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());

      // Fetch kudos recipients for kudos posts
      const kudosPostsWithRecipients = uniquePosts.filter(
        p => p.post_type === 'kudos' && p.kudos_recipient_ids?.length > 0
      );

      if (kudosPostsWithRecipients.length > 0) {
        const allRecipientIds = kudosPostsWithRecipients.flatMap(p => p.kudos_recipient_ids);
        const uniqueIds = [...new Set(allRecipientIds)];

        const { data: recipients } = await supabase
          .from('employees')
          .select('id, profiles!inner(full_name, avatar_url)')
          .in('id', uniqueIds);

        if (recipients) {
          const recipientMap = new Map(recipients.map(r => [r.id, r]));
          uniquePosts.forEach(post => {
            if (post.post_type === 'kudos' && post.kudos_recipient_ids?.length > 0) {
              post.kudos_recipients = post.kudos_recipient_ids
                .map(id => recipientMap.get(id))
                .filter(Boolean) as Post['kudos_recipients'];
            }
          });
        }
      }

      // Sort by created_at descending
      return uniquePosts.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!currentOrg?.id && !!employeeId,
    staleTime: 30 * 1000,
  });
};
