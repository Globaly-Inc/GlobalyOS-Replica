/**
 * Create Post Modal
 * Full-featured modal for creating posts with type selection, media, polls, etc.
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
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { AIWritingAssist } from '@/components/AIWritingAssist';
import { PostVisibilitySelector, AccessScope } from '@/components/feed/PostVisibilitySelector';
import { useCreatePost, PostType } from '@/services/useSocialFeed';
import { format } from 'date-fns';

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

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPostType?: PostType | null;
  initialWithPoll?: boolean;
  canPostAnnouncement?: boolean;
  canPostExecutive?: boolean;
}

export const CreatePostModal = ({
  open,
  onOpenChange,
  initialPostType = null,
  initialWithPoll = false,
  canPostAnnouncement = false,
  canPostExecutive = false,
}: CreatePostModalProps) => {
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const createPost = useCreatePost();
  
  const [selectedType, setSelectedType] = useState<PostType | null>(initialPostType);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  
  // Scheduling (for executive messages)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

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

  // Set initial values when modal opens
  useEffect(() => {
    if (open) {
      setSelectedType(initialPostType);
      setShowPoll(initialWithPoll);
    }
  }, [open, initialPostType, initialWithPoll]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
    
    if (validFiles.length < files.length) {
      toast({
        title: 'Some files skipped',
        description: 'Files must be under 10MB',
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
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        setErrors({ poll: 'At least 2 poll options are required' });
        return;
      }
    }

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
        options: pollOptions.filter(o => o.trim()),
        allow_multiple: pollAllowMultiple,
      } : undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedType(null);
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
    setScheduledAt(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const postTypes = [
    { type: 'win' as PostType, icon: Trophy, label: 'Win', color: 'amber', description: 'Celebrate an achievement' },
    { type: 'kudos' as PostType, icon: Heart, label: 'Kudos', color: 'pink', description: 'Recognize a teammate' },
    { type: 'social' as PostType, icon: MessageSquare, label: 'Social', color: 'green', description: 'Share with the team' },
    ...(canPostAnnouncement ? [{ type: 'announcement' as PostType, icon: Megaphone, label: 'Announcement', color: 'blue', description: 'Important updates' }] : []),
    ...(canPostExecutive ? [{ type: 'executive_message' as PostType, icon: Crown, label: 'Executive', color: 'purple', description: 'Leadership message' }] : []),
  ];

  const selectedTypeConfig = postTypes.find(t => t.type === selectedType);

  const filteredMembers = teamMembers.filter(m =>
    m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {selectedType 
              ? `Create ${selectedTypeConfig?.label}` 
              : 'What would you like to share?'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Post Type Selection */}
          {!selectedType && (
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
              {/* Back button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedType(null)}
                className="text-muted-foreground"
              >
                ← Change type
              </Button>

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
                <div className="flex items-center justify-between">
                  <Label>Content *</Label>
                  <AIWritingAssist
                    type={selectedType === 'announcement' ? 'announcement' : 'win'}
                    currentText={content}
                    onTextGenerated={setContent}
                  />
                </div>
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
                />
                {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Add Media (optional)</Label>
                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removeMedia(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Image className="h-4 w-4" />
                  Add Photo/Video
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </div>

              {/* Poll Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Poll</Label>
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
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

              {/* Scheduling (Executive only) */}
              {selectedType === 'executive_message' && (
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

              {/* Submit */}
              <div className="pt-4 border-t sticky bottom-0 bg-background">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createPost.isPending}
                >
                  {createPost.isPending ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
