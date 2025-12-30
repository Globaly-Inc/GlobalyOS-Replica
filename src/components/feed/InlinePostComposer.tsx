/**
 * Inline Post Composer
 * Expandable inline composer with post type pills, media, poll, tags, and visibility
 */

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RichTextEditor, MentionState, extractMentionIds } from '@/components/ui/rich-text-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MentionAutocomplete from '@/components/chat/MentionAutocomplete';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  Trophy, Megaphone, Heart, MessageSquare, Crown, 
  Image, X, ChevronDown, Search, Plus, Trash2,
  BarChart3, Users, Globe, Video, Loader2, Smile
} from 'lucide-react';
import { GifPicker } from './GifPicker';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { PostVisibilitySelector, AccessScope } from '@/components/feed/PostVisibilitySelector';
import { useCreatePost, PostType } from '@/services/useSocialFeed';
import { AIWritingAssist } from '@/components/AIWritingAssist';
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

interface InlinePostComposerProps {
  canPostAnnouncement?: boolean;
  canPostExecutive?: boolean;
}

export const InlinePostComposer = ({ 
  canPostAnnouncement = false,
  canPostExecutive = false 
}: InlinePostComposerProps) => {
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const createPost = useCreatePost();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<PostType>('social');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
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
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  
  // Upload progress
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  
  // Mention state for @ detection in rich text
  const [mentionState, setMentionState] = useState<MentionState>({ isOpen: false, searchText: '' });

  // Load team members when expanded
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!isExpanded || !currentOrg) {
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
  }, [isExpanded, currentOrg?.id]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
    
    if (validFiles.length < files.length) {
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
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleSubmit = async () => {
    setErrors({});

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
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        setErrors({ poll: 'At least 2 poll options are required' });
        return;
      }
    }

    // Initialize upload progress if there are media files
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
        media_files: mediaFiles.length > 0 ? mediaFiles : undefined,
        mention_ids: mentionIds.length > 0 ? mentionIds : undefined,
        office_ids: accessScope === 'offices' ? selectedOfficeIds : undefined,
        departments: accessScope === 'departments' ? selectedDepartments : undefined,
        project_ids: accessScope === 'projects' ? selectedProjectIds : undefined,
        poll: showPoll ? {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim()),
          allow_multiple: pollAllowMultiple,
        } : undefined,
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
      resetForm();
    } finally {
      setUploadingFiles([]);
    }
  };

  const resetForm = () => {
    setIsExpanded(false);
    setSelectedType('social');
    setContent('');
    setMediaFiles([]);
    setMediaPreviews([]);
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
    setPollOptions(['', '']);
    setPollAllowMultiple(false);
    setUploadingFiles([]);
  };

  const postTypes = [
    { type: 'win' as PostType, icon: Trophy, label: 'Win', color: 'amber' },
    { type: 'kudos' as PostType, icon: Heart, label: 'Kudos', color: 'pink' },
    { type: 'social' as PostType, icon: Users, label: 'Social', color: 'green' },
    { type: 'update' as PostType, icon: MessageSquare, label: 'Updates', color: 'cyan' },
    ...(canPostAnnouncement ? [{ type: 'announcement' as PostType, icon: Megaphone, label: 'Announcement', color: 'blue' }] : []),
    ...(canPostExecutive ? [{ type: 'executive_message' as PostType, icon: Crown, label: 'Executive', color: 'purple' }] : []),
  ];

  const filteredMembers = teamMembers.filter(m =>
    m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentEmployee) return null;

  const initials = currentEmployee.profiles.full_name
    .split(' ')
    .map(n => n[0])
    .join('');

  const getAIType = (postType: PostType): "win" | "announcement" | "kudos" | "social" => {
    switch (postType) {
      case 'win': return 'win';
      case 'kudos': return 'kudos';
      case 'announcement':
      case 'executive_message': return 'announcement';
      case 'social':
      case 'update':
      default: return 'social';
    }
  };

  const canSubmit = getTextLength(content) >= 3 && (selectedType !== 'kudos' || kudosRecipients.length > 0);

  return (
    <Card className="p-4 bg-card border-border shadow-sm">
      {/* Main composer area */}
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 border border-border/50 shrink-0">
          <AvatarImage src={currentEmployee.profiles.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          {/* Content editor */}
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left px-4 py-2.5 rounded-full bg-muted/50 hover:bg-muted border border-border/50 text-muted-foreground text-sm transition-colors"
            >
              Share something...
            </button>
          ) : (
            <>
              {/* Post Type Pills */}
              <div className="flex flex-wrap gap-2">
                {postTypes.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                      selectedType === type ? [
                        'ring-2 ring-offset-2 ring-offset-background',
                        color === 'amber' && 'bg-amber-100 text-amber-700 border-amber-300 ring-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
                        color === 'pink' && 'bg-pink-100 text-pink-700 border-pink-300 ring-pink-400 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700',
                        color === 'green' && 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
                        color === 'cyan' && 'bg-cyan-100 text-cyan-700 border-cyan-300 ring-cyan-400 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
                        color === 'blue' && 'bg-blue-100 text-blue-700 border-blue-300 ring-blue-400 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
                        color === 'purple' && 'bg-purple-100 text-purple-700 border-purple-300 ring-purple-400 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
                      ] : [
                        'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border',
                      ]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Kudos Recipients (when kudos type selected) */}
              {selectedType === 'kudos' && (
                <div className="space-y-2">
                  <Popover open={memberSelectOpen} onOpenChange={setMemberSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal h-auto min-h-10"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Heart className="h-4 w-4 text-pink-500" />
                          {kudosRecipients.length === 0
                            ? 'Who deserves kudos?'
                            : `${kudosRecipients.length} team member${kudosRecipients.length > 1 ? 's' : ''} selected`}
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

              {/* Rich Text Editor */}
              <div className="relative">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder={
                    selectedType === 'kudos' ? 'Why are you giving kudos? Use @ to mention...' :
                    selectedType === 'announcement' ? 'Share an important announcement... Use @ to mention...' :
                    selectedType === 'win' ? 'Share your win or achievement... Use @ to mention...' :
                    'What\'s on your mind? Use @ to mention...'
                  }
                  minHeight="80px"
                  onMentionStateChange={setMentionState}
                  onMentionInsert={(memberId) => {
                    if (!mentionIds.includes(memberId)) {
                      setMentionIds(prev => [...prev, memberId]);
                    }
                  }}
                />
                <MentionAutocomplete
                  isOpen={mentionState.isOpen}
                  searchText={mentionState.searchText}
                  onSelect={(member) => {
                    // The RichTextEditor handles insertion, we just need to close
                    const editorEl = document.querySelector('[contenteditable]') as any;
                    editorEl?.insertMention?.(member.id, member.name);
                  }}
                  onClose={() => setMentionState({ isOpen: false, searchText: '' })}
                />
              </div>
              {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}

              {/* AI Writing Assist */}
              <div className="flex justify-end -mt-1">
                <AIWritingAssist
                  type={getAIType(selectedType)}
                  currentText={content}
                  onTextGenerated={setContent}
                  context={selectedType === 'kudos' && kudosRecipients.length > 0 
                    ? `Giving kudos to ${kudosRecipients.length} team member(s)` 
                    : undefined}
                />
              </div>

              {/* Media Previews */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-border">
                      {mediaFiles[index]?.type.startsWith('video/') ? (
                        <video src={preview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Poll Builder */}
              {showPoll && (
                <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Poll</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPoll(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                  />
                  <div className="space-y-2">
                    {pollOptions.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                        />
                        {pollOptions.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePollOption(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollOptions.length < 6 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPollOption}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allow-multiple"
                      checked={pollAllowMultiple}
                      onCheckedChange={(checked) => setPollAllowMultiple(checked === true)}
                    />
                    <Label htmlFor="allow-multiple" className="text-sm font-normal cursor-pointer">
                      Allow multiple selections
                    </Label>
                  </div>
                  {errors.poll && <p className="text-sm text-destructive">{errors.poll}</p>}
                </div>
              )}

              {/* Tagged Members */}
              {mentionIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Tagged:</span>
                  {mentionIds.map(id => {
                    const member = teamMembers.find(m => m.id === id);
                    if (!member) return null;
                    return (
                      <Badge key={id} variant="outline" className="gap-1 text-xs">
                        @{member.profiles.full_name}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setMentionIds(prev => prev.filter(mId => mId !== id))}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Upload Progress */}
              {uploadingFiles.length > 0 && (
                <UploadProgress files={uploadingFiles} />
              )}

              {/* Visibility Row - dedicated section */}
              <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action bar - simplified */}
      <div className={cn(
        "flex items-center justify-between mt-3 pt-3 border-t border-border/50",
        !isExpanded && "flex-wrap gap-2"
      )}>
        {/* Left: Media/Poll/Tag buttons */}
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleMediaSelect}
          />
          <input
            type="file"
            ref={videoInputRef}
            className="hidden"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska,video/x-ms-wmv,.mp4,.mov,.avi,.webm,.mkv,.wmv"
            multiple
            onChange={handleMediaSelect}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={() => {
              if (!isExpanded) setIsExpanded(true);
              fileInputRef.current?.click();
            }}
          >
            <Image className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">Image</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={() => {
              if (!isExpanded) setIsExpanded(true);
              videoInputRef.current?.click();
            }}
          >
            <Video className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Video</span>
          </Button>

          <GifPicker
            onSelect={(gifUrl) => {
              if (!isExpanded) setIsExpanded(true);
              // Add GIF as a preview (treat as image)
              setMediaPreviews(prev => [...prev, gifUrl]);
              // Create a fake File for submission
              fetch(gifUrl)
                .then(res => res.blob())
                .then(blob => {
                  const file = new File([blob], 'gif.gif', { type: 'image/gif' });
                  setMediaFiles(prev => [...prev, file]);
                })
                .catch(() => {
                  // Fallback: add as external URL
                  setMediaPreviews(prev => [...prev, gifUrl]);
                });
            }}
            triggerClassName="text-muted-foreground hover:text-foreground"
          />

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground hover:text-foreground gap-2",
              showPoll && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            )}
            onClick={() => {
              if (!isExpanded) setIsExpanded(true);
              setShowPoll(!showPoll);
            }}
          >
            <BarChart3 className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">Poll</span>
          </Button>

          {/* Tag Members */}
          <Popover open={mentionSelectOpen} onOpenChange={setMentionSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground gap-2",
                  mentionIds.length > 0 && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                )}
                onClick={() => {
                  if (!isExpanded) setIsExpanded(true);
                }}
              >
                <Users className="h-4 w-4 text-violet-500" />
                <span className="hidden sm:inline">Tag</span>
                {mentionIds.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {mentionIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-popover" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team members..."
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

        {/* Right: Cancel + Post buttons (when expanded) */}
        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createPost.isPending}
                className="gap-2"
              >
                {createPost.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Post
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
