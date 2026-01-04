/**
 * Create Post Modal
 * Full-featured modal for creating/editing posts with type selection, media, polls, etc.
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  Trophy, Megaphone, Heart, MessageSquare, Crown, 
  Image, X, ChevronDown, Search, Plus, Trash2, Calendar,
  BarChart3, AlertTriangle, Users, FileText, Video
} from 'lucide-react';
import { PdfThumbnailPreview } from './PdfThumbnailPreview';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { AIWritingAssist } from '@/components/AIWritingAssist';
import { PostVisibilitySelector, AccessScope } from '@/components/feed/PostVisibilitySelector';
import { useCreatePost, useUpdatePost, PostType, Post } from '@/services/useSocialFeed';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UploadProgress, { UploadingFile } from '@/components/chat/UploadProgress';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const getTextLength = (html: string): number => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').trim().length;
};

const postSchema = z.object({
  content: z.string()
    .refine((val) => getTextLength(val) >= 3, { message: 'Content must be at least 3 characters' })
    .refine((val) => getTextLength(val) <= 5000, { message: 'Content must be less than 5000 characters' }),
});

interface TeamMember {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ExistingMedia {
  id: string;
  file_url: string;
  media_type: string;
}

interface PollOptionWithId {
  id?: string;
  text: string;
  hasVotes?: boolean;
}

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPostType?: PostType | null;
  initialWithPoll?: boolean;
  canPostAnnouncement?: boolean;
  canPostExecutive?: boolean;
  editPost?: Post | null;
}

export const CreatePostModal = ({
  open,
  onOpenChange,
  initialPostType = null,
  initialWithPoll = false,
  canPostAnnouncement = false,
  canPostExecutive = false,
  editPost = null,
}: CreatePostModalProps) => {
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  
  const isEditMode = !!editPost;
  
  const [selectedType, setSelectedType] = useState<PostType | null>(initialPostType);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [removedMediaUrls, setRemovedMediaUrls] = useState<string[]>([]);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  
  // Track attachment type for mutual exclusivity (none, pdf, or media)
  type AttachmentType = 'none' | 'pdf' | 'media';
  const getAttachmentType = (): AttachmentType => {
    const allMedia = [
      ...existingMedia.map(m => m.media_type),
      ...mediaFiles.map(f => f.type === 'application/pdf' ? 'pdf' : 'image')
    ];
    if (allMedia.length === 0) return 'none';
    if (allMedia.some(t => t === 'pdf')) return 'pdf';
    return 'media';
  };
  const attachmentType = getAttachmentType();
  
  // Team members (for kudos and mentions)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [kudosRecipients, setKudosRecipients] = useState<string[]>([]);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [memberSelectOpen, setMemberSelectOpen] = useState(false);
  const [mentionSelectOpen, setMentionSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Visibility
  const [accessScope, setAccessScope] = useState<AccessScope>('company');
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  
  // Poll
  const [showPoll, setShowPoll] = useState(initialWithPoll);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<PollOptionWithId[]>([{ text: '' }, { text: '' }]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [existingPollId, setExistingPollId] = useState<string | null>(null);
  const [removedOptionIds, setRemovedOptionIds] = useState<string[]>([]);
  const [optionsWithVotes, setOptionsWithVotes] = useState<Set<string>>(new Set());
  
  // Scheduling (for executive messages)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  
  // Acknowledgment
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false);
  const [acknowledgmentDeadline, setAcknowledgmentDeadline] = useState<string | null>(null);
  
  // Upload progress
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Load team members
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!open || !currentOrg) {
        hasFetchedRef.current = false;
        return;
      }
      
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          profiles!employees_user_id_fkey (full_name, avatar_url)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active')
        .neq('user_id', user.id);

      if (employees) {
        setTeamMembers(employees as TeamMember[]);
      }
    };

    fetchTeamMembers();
  }, [open, currentOrg?.id]);

  // Pre-populate form when editing
  useEffect(() => {
    if (!open) return;

    if (editPost) {
      // Pre-populate from editPost
      setSelectedType(editPost.post_type);
      setContent(editPost.content);
      setAccessScope(editPost.access_scope as AccessScope || 'company');
      setKudosRecipients(editPost.kudos_recipient_ids || []);
      
      // Pre-populate existing media
      if (editPost.post_media?.length) {
        setExistingMedia(editPost.post_media.map(m => ({
          id: m.id,
          file_url: m.file_url,
          media_type: m.media_type,
        })));
      }
      
      // Pre-populate visibility scopes
      if (editPost.post_offices?.length) {
        setSelectedOfficeIds(editPost.post_offices.map(o => o.office?.name).filter(Boolean) as string[]);
      }
      if (editPost.post_departments?.length) {
        setSelectedDepartments(editPost.post_departments.map(d => d.department).filter(Boolean) as string[]);
      }
      if (editPost.post_projects?.length) {
        setSelectedProjectIds(editPost.post_projects.map(p => p.project?.name).filter(Boolean) as string[]);
      }
      
      // Pre-populate poll
      if (editPost.post_polls?.length) {
        const poll = editPost.post_polls[0];
        setShowPoll(true);
        setPollQuestion(poll.question);
        setExistingPollId(poll.id);
        setPollAllowMultiple(poll.allow_multiple);
        setPollOptions(
          poll.poll_options?.map(o => ({
            id: o.id,
            text: o.option_text,
          })) || [{ text: '' }, { text: '' }]
        );
        
        // Check for votes on poll options
        const checkVotes = async () => {
          const { data: votes } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', poll.id);
          
          if (votes?.length) {
            const votedOptionIds = new Set(votes.map(v => v.option_id));
            setOptionsWithVotes(votedOptionIds);
            // Update poll options with vote status
            setPollOptions(prev => prev.map(opt => ({
              ...opt,
              hasVotes: opt.id ? votedOptionIds.has(opt.id) : false,
            })));
          }
        };
        checkVotes();
      }
      
      // Pre-populate mentions
      if (editPost.post_mentions?.length) {
        setMentionIds(editPost.post_mentions.map(m => m.employee_id));
      }
      
      // Pre-populate acknowledgment settings
      setRequiresAcknowledgment(editPost.requires_acknowledgment || false);
      setAcknowledgmentDeadline(editPost.acknowledgment_deadline || null);
    } else {
      // New post mode
      setSelectedType(initialPostType);
      setShowPoll(initialWithPoll);
    }
  }, [open, editPost, initialPostType, initialWithPoll]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter out PDFs from media selection (they should use PDF button)
    const validFiles = files.filter(file => {
      if (file.type === 'application/pdf') {
        toast({
          title: 'Use PDF button',
          description: 'PDFs cannot be mixed with images/videos. Use the PDF button instead.',
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        return false;
      }
      return true;
    });
    
    if (validFiles.length < files.filter(f => f.type !== 'application/pdf').length) {
      toast({
        title: 'Some files skipped',
        description: 'Files must be under 50MB',
        variant: 'destructive',
      });
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
    
    // Reset file input
    if (e.target) e.target.value = '';
  };
  
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'PDF must be under 50MB',
        variant: 'destructive',
      });
      return;
    }
    
    // Clear any existing media (enforce mutual exclusivity)
    if (existingMedia.length > 0 || mediaFiles.length > 0) {
      setRemovedMediaIds(prev => [...prev, ...existingMedia.map(m => m.id)]);
      setRemovedMediaUrls(prev => [...prev, ...existingMedia.map(m => m.file_url)]);
      setExistingMedia([]);
      setMediaFiles([]);
      setMediaPreviews([]);
    }
    
    // Add PDF
    setMediaFiles([file]);
    setMediaPreviews([`pdf:${file.name}`]);
    
    // Reset file input
    if (e.target) e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (media: ExistingMedia) => {
    setExistingMedia(prev => prev.filter(m => m.id !== media.id));
    setRemovedMediaIds(prev => [...prev, media.id]);
    setRemovedMediaUrls(prev => [...prev, media.file_url]);
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, { text: '' }]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const option = pollOptions[index];
      
      // Check if this option has votes
      if (option.id && optionsWithVotes.has(option.id)) {
        toast({
          title: 'Cannot remove option',
          description: 'This option has votes and cannot be deleted',
          variant: 'destructive',
        });
        return;
      }
      
      // Track removed option ID for backend
      if (option.id) {
        setRemovedOptionIds(prev => [...prev, option.id!]);
      }
      
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = { ...updated[index], text: value };
    setPollOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selectedType) {
      toast({ title: 'Please select a post type', variant: 'destructive' });
      return;
    }

    try {
      postSchema.parse({ content });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    // Validate kudos recipients
    if (selectedType === 'kudos' && kudosRecipients.length === 0) {
      setErrors({ kudos: 'Please select at least one team member to give kudos to' });
      return;
    }

    // Validate poll
    if (showPoll) {
      if (!pollQuestion.trim()) {
        setErrors({ poll: 'Poll question is required' });
        return;
      }
      const validOptions = pollOptions.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        setErrors({ poll: 'At least 2 poll options are required' });
        return;
      }
    }

    if (isEditMode && editPost) {
      // Update existing post
      await updatePost.mutateAsync({
        postId: editPost.id,
        content,
        access_scope: accessScope,
        kudos_recipient_ids: selectedType === 'kudos' ? kudosRecipients : [],
        mention_ids: mentionIds.length > 0 ? mentionIds : [],
        office_ids: accessScope === 'offices' ? selectedOfficeIds : undefined,
        departments: accessScope === 'departments' ? selectedDepartments : undefined,
        project_ids: accessScope === 'projects' ? selectedProjectIds : undefined,
        newMediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
        removedMediaIds: removedMediaIds.length > 0 ? removedMediaIds : undefined,
        removedMediaUrls: removedMediaUrls.length > 0 ? removedMediaUrls : undefined,
        existingPollId: existingPollId,
        poll: showPoll ? {
          question: pollQuestion,
          options: pollOptions
            .filter(o => o.text.trim())
            .map(o => ({ id: o.id, text: o.text })),
          allow_multiple: pollAllowMultiple,
        } : undefined,
        removedOptionIds: removedOptionIds.filter(id => !optionsWithVotes.has(id)),
        requires_acknowledgment: requiresAcknowledgment,
        acknowledgment_deadline: acknowledgmentDeadline,
      });
    } else {
      // Create new post - initialize upload progress if there are media files
      if (mediaFiles.length > 0) {
        setUploadingFiles(mediaFiles.map((file, index) => ({
          id: `upload-${index}`,
          name: file.name,
          progress: 0,
          status: 'uploading' as const,
          preview: mediaPreviews[index],
        })));
      }

      try {
        await createPost.mutateAsync({
          post_type: selectedType,
          content,
          kudos_recipient_ids: selectedType === 'kudos' ? kudosRecipients : undefined,
          access_scope: accessScope,
          scheduled_at: selectedType === 'executive_message' ? scheduledAt : undefined,
          media_files: mediaFiles.length > 0 ? mediaFiles : undefined,
          mention_ids: mentionIds.length > 0 ? mentionIds : undefined,
          office_ids: accessScope === 'offices' ? selectedOfficeIds : undefined,
          departments: accessScope === 'departments' ? selectedDepartments : undefined,
          project_ids: accessScope === 'projects' ? selectedProjectIds : undefined,
          poll: showPoll ? {
            question: pollQuestion,
            options: pollOptions.filter(o => o.text.trim()).map(o => o.text),
            allow_multiple: pollAllowMultiple,
          } : undefined,
          requires_acknowledgment: requiresAcknowledgment,
          acknowledgment_deadline: acknowledgmentDeadline,
          onUploadProgress: ({ current, total, fileIndex }) => {
            setUploadingFiles(prev => prev.map((f, idx) => 
              idx === fileIndex 
                ? { ...f, progress: Math.round((current / total) * 100), status: current >= total ? 'complete' : 'uploading' }
                : idx < fileIndex 
                  ? { ...f, progress: 100, status: 'complete' }
                  : f
            ));
          },
        });
      } finally {
        setUploadingFiles([]);
      }
    }

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedType(null);
    setContent('');
    setMediaFiles([]);
    setMediaPreviews([]);
    setExistingMedia([]);
    setRemovedMediaIds([]);
    setRemovedMediaUrls([]);
    setKudosRecipients([]);
    setMentionIds([]);
    setSearchQuery('');
    setErrors({});
    setAccessScope('company');
    setSelectedOfficeIds([]);
    setSelectedDepartments([]);
    setSelectedProjectIds([]);
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions([{ text: '' }, { text: '' }]);
    setPollAllowMultiple(false);
    setExistingPollId(null);
    setRemovedOptionIds([]);
    setOptionsWithVotes(new Set());
    setScheduledAt(null);
    setUploadingFiles([]);
    setRequiresAcknowledgment(false);
    setAcknowledgmentDeadline(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const postTypes = [
    { type: 'win' as PostType, icon: Trophy, label: 'Win', color: 'amber', description: 'Celebrate an achievement' },
    { type: 'kudos' as PostType, icon: Heart, label: 'Kudos', color: 'pink', description: 'Recognize a teammate' },
    { type: 'social' as PostType, icon: Users, label: 'Social', color: 'green', description: 'Share with the team' },
    { type: 'update' as PostType, icon: MessageSquare, label: 'Updates', color: 'cyan', description: 'Share a progress update' },
    ...(canPostAnnouncement ? [{ type: 'announcement' as PostType, icon: Megaphone, label: 'Announcement', color: 'blue', description: 'Important updates' }] : []),
    ...(canPostExecutive ? [{ type: 'executive_message' as PostType, icon: Crown, label: 'Executive', color: 'purple', description: 'Leadership message' }] : []),
  ];

  const selectedTypeConfig = postTypes.find(t => t.type === selectedType);

  const filteredMembers = teamMembers.filter(m =>
    m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPending = isEditMode ? updatePost.isPending : createPost.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? `Edit ${selectedTypeConfig?.label || 'Post'}`
              : selectedType 
                ? `Create ${selectedTypeConfig?.label}` 
                : 'What would you like to share?'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Post Type Selection (only in create mode) */}
          {!selectedType && !isEditMode && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {postTypes.map(({ type, icon: Icon, label, color, description }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary',
                    'bg-muted/30 border-border text-left',
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-full',
                      color === 'amber' && 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                      color === 'pink' && 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
                      color === 'green' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                      color === 'cyan' && 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
                      color === 'blue' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                      color === 'purple' && 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground text-center">{description}</span>
                </button>
              ))}
            </div>
          )}

          {/* Post Form */}
          {selectedType && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Back button or post type badge */}
              {isEditMode ? (
                <Badge variant="secondary" className="gap-1">
                  {selectedTypeConfig && (
                    <>
                      <selectedTypeConfig.icon className="h-3 w-3" />
                      {selectedTypeConfig.label}
                    </>
                  )}
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType(null)}
                  className="text-muted-foreground"
                >
                  ← Change type
                </Button>
              )}

              {/* Kudos Recipients */}
              {selectedType === 'kudos' && (
                <div className="space-y-2">
                  <Label>Who deserves kudos? *</Label>
                  <Popover open={memberSelectOpen} onOpenChange={setMemberSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal h-auto min-h-10"
                      >
                        <span className="text-muted-foreground">
                          {kudosRecipients.length === 0
                            ? 'Select team members...'
                            : `${kudosRecipients.length} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" align="start">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                          />
                        </div>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                        {filteredMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => {
                              setKudosRecipients(prev =>
                                prev.includes(member.id)
                                  ? prev.filter(id => id !== member.id)
                                  : [...prev, member.id]
                              );
                            }}
                          >
                            <Checkbox checked={kudosRecipients.includes(member.id)} />
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.profiles.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.profiles.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {kudosRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {kudosRecipients.map(id => {
                        const member = teamMembers.find(m => m.id === id);
                        if (!member) return null;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {member.profiles.full_name}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => setKudosRecipients(prev => prev.filter(mId => mId !== id))}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  {errors.kudos && <p className="text-sm text-destructive">{errors.kudos}</p>}
                </div>
              )}

              {/* Content */}
              <div className="space-y-2">
                <Label>Content *</Label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder={
                    selectedType === 'kudos' ? 'Why are you giving kudos?' :
                    selectedType === 'announcement' ? 'Share an important announcement...' :
                    selectedType === 'win' ? 'Share your win or achievement...' :
                    'What\'s on your mind?'
                  }
                  minHeight="100px"
                  renderToolbarRight={() => (
                    <AIWritingAssist
                      type={selectedType === 'announcement' ? 'announcement' : 'win'}
                      currentText={content}
                      onTextGenerated={setContent}
                    />
                  )}
                />
                {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Add Media (optional)</Label>
                
                {/* Existing Media (Edit Mode) */}
                {existingMedia.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {existingMedia.map((media) => {
                      const isPdf = media.media_type === 'pdf' || media.file_url.toLowerCase().endsWith('.pdf');
                      const fileName = media.file_url.split('/').pop() || 'document.pdf';
                      
                      return (
                        <div key={media.id} className="relative">
                          {isPdf ? (
                            <PdfThumbnailPreview 
                              url={media.file_url} 
                              fileName={fileName}
                            />
                          ) : media.media_type === 'video' ? (
                            <video
                              src={media.file_url}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <img
                              src={media.file_url}
                              alt="Existing media"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 z-10"
                            onClick={() => removeExistingMedia(media)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* New Media Previews */}
                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaPreviews.map((preview, index) => {
                      const isPdf = preview.startsWith('pdf:');
                      const pdfName = isPdf ? preview.replace('pdf:', '') : '';
                      const pdfFile = isPdf ? mediaFiles[index] : undefined;
                      
                      return (
                        <div key={index} className="relative">
                          {isPdf ? (
                            <PdfThumbnailPreview 
                              file={pdfFile}
                              fileName={pdfName}
                            />
                          ) : preview.startsWith('data:video') ? (
                            <div className="w-full h-20 flex items-center justify-center bg-muted rounded-lg border border-border">
                              <Video className="h-6 w-6 text-blue-500" />
                            </div>
                          ) : (
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 z-10"
                            onClick={() => removeMedia(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Attachment type indicator */}
                {attachmentType !== 'none' && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 py-1">
                    {attachmentType === 'pdf' ? (
                      <>
                        <FileText className="h-3 w-3 text-rose-500" />
                        PDF attached — remove to add images/videos
                      </>
                    ) : (
                      <>
                        <Image className="h-3 w-3 text-emerald-500" />
                        Media attached — remove to add PDF
                      </>
                    )}
                  </div>
                )}
                
                {/* Action buttons - always visible, disabled when incompatible */}
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => mediaFileInputRef.current?.click()}
                            disabled={attachmentType === 'pdf'}
                            className="gap-2"
                          >
                            <Image className="h-4 w-4 text-emerald-500" />
                            Add Photo/Video
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {attachmentType === 'pdf' && (
                        <TooltipContent>
                          <p>Remove PDF to add photos/videos</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => pdfFileInputRef.current?.click()}
                            disabled={attachmentType === 'media'}
                            className="gap-2"
                          >
                            <FileText className="h-4 w-4 text-rose-500" />
                            Add PDF
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {attachmentType === 'media' && (
                        <TooltipContent>
                          <p>Remove photos/videos to add PDF</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Hidden file inputs */}
                <input
                  ref={mediaFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfSelect}
                  className="hidden"
                />
              </div>

              {/* Poll Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Poll</Label>
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant={showPoll ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setShowPoll(!showPoll)}
                      className="gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      {showPoll ? 'Remove Poll' : 'Add Poll'}
                    </Button>
                  )}
                </div>
                
                {showPoll && (
                  <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <Input
                      placeholder="Poll question..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                    />
                    
                    <div className="space-y-2">
                      {pollOptions.map((option, index) => (
                        <div key={option.id || index} className="flex gap-2 items-center">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => updatePollOption(index, e.target.value)}
                          />
                          {pollOptions.length > 2 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removePollOption(index)}
                                      disabled={option.hasVotes}
                                      className={option.hasVotes ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                      {option.hasVotes ? (
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                {option.hasVotes && (
                                  <TooltipContent>
                                    <p>This option has votes and cannot be deleted</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ))}
                      
                      {pollOptions.length < 6 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addPollOption}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Option
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={pollAllowMultiple}
                        onCheckedChange={(checked) => setPollAllowMultiple(checked as boolean)}
                      />
                      <span className="text-sm">Allow multiple selections</span>
                    </div>
                    
                    {optionsWithVotes.size > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Options with votes cannot be deleted
                      </p>
                    )}
                    
                    {errors.poll && <p className="text-sm text-destructive">{errors.poll}</p>}
                  </div>
                )}
              </div>

              {/* Tag Team Members */}
              <div className="space-y-2">
                <Label>Tag Team Members (optional)</Label>
                <Popover open={mentionSelectOpen} onOpenChange={setMentionSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal h-auto min-h-10"
                    >
                      <span className="text-muted-foreground">
                        {mentionIds.length === 0
                          ? 'Choose team members...'
                          : `${mentionIds.length} selected`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setMentionIds(prev =>
                              prev.includes(member.id)
                                ? prev.filter(id => id !== member.id)
                                : [...prev, member.id]
                            );
                          }}
                        >
                          <Checkbox checked={mentionIds.includes(member.id)} />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.profiles.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.profiles.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Visibility */}
              <PostVisibilitySelector
                accessScope={accessScope}
                onAccessScopeChange={setAccessScope}
                selectedOfficeIds={selectedOfficeIds}
                onOfficeIdsChange={setSelectedOfficeIds}
                selectedDepartments={selectedDepartments}
                onDepartmentsChange={setSelectedDepartments}
                selectedProjectIds={selectedProjectIds}
                onProjectIdsChange={setSelectedProjectIds}
              />

              {/* Acknowledgment Required (for update/announcement/executive - Owner/Admin/HR only) */}
              {(selectedType === 'update' || selectedType === 'announcement' || selectedType === 'executive_message') && 
               (canPostAnnouncement || canPostExecutive) && (
                <div className="space-y-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requires-ack"
                      checked={requiresAcknowledgment}
                      onCheckedChange={(checked) => setRequiresAcknowledgment(checked as boolean)}
                    />
                    <Label htmlFor="requires-ack" className="text-sm font-medium cursor-pointer">
                      Require team members to acknowledge this post
                    </Label>
                  </div>
                  
                  {requiresAcknowledgment && (
                    <div className="space-y-2 pl-6">
                      <Label className="text-xs text-muted-foreground">
                        Optional deadline
                      </Label>
                      <Input
                        type="datetime-local"
                        value={acknowledgmentDeadline || ''}
                        onChange={(e) => setAcknowledgmentDeadline(e.target.value || null)}
                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        className="text-sm"
                      />
                      {acknowledgmentDeadline && (
                        <p className="text-xs text-muted-foreground">
                          Team members should acknowledge by {format(new Date(acknowledgmentDeadline), 'PPpp')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Scheduling (Executive only, create mode only) */}
              {selectedType === 'executive_message' && !isEditMode && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule Post (optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt || ''}
                    onChange={(e) => setScheduledAt(e.target.value || null)}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  />
                  {scheduledAt && (
                    <p className="text-xs text-muted-foreground">
                      Will be published on {format(new Date(scheduledAt), 'PPpp')}
                    </p>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {uploadingFiles.length > 0 && (
                <UploadProgress files={uploadingFiles} />
              )}

              {/* Submit */}
              <div className="pt-4 border-t sticky bottom-0 bg-background">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                >
                  {isPending 
                    ? (isEditMode ? 'Saving...' : 'Posting...') 
                    : (isEditMode ? 'Save Changes' : 'Post')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
