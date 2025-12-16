import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Image, X, ChevronDown, Search } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AIWritingAssist } from "@/components/AIWritingAssist";
import { PostVisibilitySelector, AccessScope } from "@/components/feed/PostVisibilitySelector";
import { ScrollArea } from "@/components/ui/scroll-area";

const getTextLength = (html: string): number => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim().length;
};

const updateSchema = z.object({
  content: z.string()
    .refine((val) => getTextLength(val) >= 10, { message: "Content must be at least 10 characters" })
    .refine((val) => getTextLength(val) <= 5000, { message: "Content must be less than 5000 characters" }),
});

interface TeamMember {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface EditUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateId: string;
  initialContent: string;
  initialImageUrl?: string | null;
  type: "win" | "announcement" | "achievement";
  onSuccess?: () => void;
}

export const EditUpdateDialog = ({
  open,
  onOpenChange,
  updateId,
  initialContent,
  initialImageUrl,
  type,
  onSuccess,
}: EditUpdateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team members / mentions state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSelectOpen, setMemberSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Visibility state
  const [accessScope, setAccessScope] = useState<AccessScope>('company');
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Load existing data when dialog opens
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setContent(initialContent);
      setImagePreview(initialImageUrl || null);
      setImageFile(null);
      setRemoveExistingImage(false);
      setError(null);
      loadExistingData();
    }
    prevOpenRef.current = open;
  }, [open, initialContent, initialImageUrl]);

  // Load team members when dialog opens
  useEffect(() => {
    if (open && currentOrg) {
      loadTeamMembers();
    }
  }, [open, currentOrg?.id]);

  const loadExistingData = async () => {
    if (!updateId) return;

    // Load mentions
    const { data: mentions } = await supabase
      .from("update_mentions")
      .select("employee_id")
      .eq("update_id", updateId);
    
    if (mentions) {
      setSelectedMembers(mentions.map(m => m.employee_id));
    }

    // Load update details including visibility
    const { data: update } = await supabase
      .from("updates")
      .select("access_scope")
      .eq("id", updateId)
      .single();

    if (update) {
      setAccessScope((update.access_scope as AccessScope) || 'company');
    }

    // Load visibility targets based on scope
    const { data: offices } = await supabase
      .from("update_offices")
      .select("office_id")
      .eq("update_id", updateId);
    if (offices) setSelectedOfficeIds(offices.map(o => o.office_id));

    const { data: departments } = await supabase
      .from("update_departments")
      .select("department")
      .eq("update_id", updateId);
    if (departments) setSelectedDepartments(departments.map(d => d.department));

    const { data: projects } = await supabase
      .from("update_projects")
      .select("project_id")
      .eq("update_id", updateId);
    if (projects) setSelectedProjectIds(projects.map(p => p.project_id));
  };

  const loadTeamMembers = async () => {
    if (!currentOrg) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: employees } = await supabase
      .from("employees")
      .select(`id, user_id, profiles!employees_user_id_fkey (full_name, avatar_url)`)
      .eq("organization_id", currentOrg.id)
      .eq("status", "active")
      .neq("user_id", user.id);

    if (employees) {
      setTeamMembers(employees as TeamMember[]);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(id => id !== memberId));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      setRemoveExistingImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (employeeId: string): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(`posts/${fileName}`, imageFile);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(`posts/${fileName}`);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validated = updateSchema.parse({ content });
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg?.id) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (!employee) {
        toast({ title: "Error", description: "Employee not found", variant: "destructive" });
        return;
      }

      // Handle image upload/removal
      let imageUrl: string | null = initialImageUrl || null;
      if (imageFile) {
        imageUrl = await uploadImage(employee.id);
      } else if (removeExistingImage) {
        imageUrl = null;
      }

      // Update the post
      const { error: updateError } = await supabase
        .from("updates")
        .update({ 
          content: validated.content,
          image_url: imageUrl,
          access_scope: accessScope,
        })
        .eq("id", updateId);

      if (updateError) throw updateError;

      // Sync mentions: delete old, insert new
      await supabase.from("update_mentions").delete().eq("update_id", updateId);
      if (selectedMembers.length > 0) {
        await supabase.from("update_mentions").insert(
          selectedMembers.map(memberId => ({
            update_id: updateId,
            employee_id: memberId,
            organization_id: employee.organization_id,
          }))
        );
      }

      // Sync visibility targets: delete old, insert new
      await supabase.from("update_offices").delete().eq("update_id", updateId);
      await supabase.from("update_departments").delete().eq("update_id", updateId);
      await supabase.from("update_projects").delete().eq("update_id", updateId);

      if (accessScope === 'offices' && selectedOfficeIds.length > 0) {
        await supabase.from("update_offices").insert(
          selectedOfficeIds.map(officeId => ({
            update_id: updateId,
            office_id: officeId,
            organization_id: employee.organization_id,
          }))
        );
      } else if (accessScope === 'departments' && selectedDepartments.length > 0) {
        await supabase.from("update_departments").insert(
          selectedDepartments.map(department => ({
            update_id: updateId,
            department,
            organization_id: employee.organization_id,
          }))
        );
      } else if (accessScope === 'projects' && selectedProjectIds.length > 0) {
        await supabase.from("update_projects").insert(
          selectedProjectIds.map(projectId => ({
            update_id: updateId,
            project_id: projectId,
            organization_id: employee.organization_id,
          }))
        );
      }

      toast({
        title: "Post updated",
        description: "Your post has been successfully updated.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message || "Validation error");
      } else if (err instanceof Error) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "win": return "Edit Win";
      case "announcement": return "Edit Announcement";
      case "achievement": return "Edit Achievement";
      default: return "Edit Post";
    }
  };

  const getSelectedNames = () => {
    return selectedMembers.map(id => {
      const member = teamMembers.find(m => m.id === id);
      return { id, name: member?.profiles.full_name || "" };
    }).filter(m => m.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {/* Content Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Content *</Label>
                  <AIWritingAssist
                    type={type === "announcement" ? "announcement" : "win"}
                    currentText={content}
                    onTextGenerated={setContent}
                  />
                </div>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Edit your post..."
                  minHeight="100px"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Photo (optional)</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to add a photo</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Tag Team Members */}
              <div className="space-y-2">
                <Label>Tag Team Members (optional)</Label>
                <Popover open={memberSelectOpen} onOpenChange={setMemberSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberSelectOpen}
                      className="w-full justify-between font-normal h-auto min-h-10"
                    >
                      <span className="text-muted-foreground">
                        {selectedMembers.length === 0
                          ? "Choose team members..."
                          : `${selectedMembers.length} selected`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
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
                    <div className="h-[200px] overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {teamMembers
                          .filter(m => m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                              onClick={() => toggleMember(member.id)}
                            >
                              <Checkbox checked={selectedMembers.includes(member.id)} className="pointer-events-none" />
                              <Avatar className="h-6 w-6">
                                {member.profiles.avatar_url && <AvatarImage src={member.profiles.avatar_url} />}
                                <AvatarFallback className="text-xs bg-muted">
                                  {member.profiles.full_name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member.profiles.full_name}</span>
                            </div>
                          ))}
                        {teamMembers.filter(m => m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No team members found</p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {getSelectedNames().length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getSelectedNames().map(({ id, name }) => (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {name}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeMember(id)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility Selector */}
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
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
