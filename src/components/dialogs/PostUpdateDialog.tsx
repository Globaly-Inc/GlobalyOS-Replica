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
import { Trophy, Megaphone, Heart, Image, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { GiveKudosDialogContent } from "./GiveKudosDialogContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { AIWritingAssist } from "@/components/AIWritingAssist";

// Helper to get plain text length from HTML
const getTextLength = (html: string): number => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim().length;
};

const updateSchema = z.object({
  content: z.string()
    .refine((val) => getTextLength(val) >= 10, { message: "Content must be at least 10 characters" })
    .refine((val) => getTextLength(val) <= 5000, { message: "Content must be less than 5000 characters" }),
  type: z.enum(["win", "announcement"], { errorMap: () => ({ message: "Please select a type" }) }),
});

interface PostUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  canPostAnnouncement?: boolean;
}

interface TeamMember {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

type PostType = "win" | "announcement" | "kudos" | null;

export const PostUpdateDialog = ({ open, onOpenChange, onSuccess, canPostAnnouncement = false }: PostUpdateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedType, setSelectedType] = useState<PostType>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSelectOpen, setMemberSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentOrg } = useOrganization();

  const [formData, setFormData] = useState({
    content: "",
  });

  // Fetch team members when dialog opens - use ref to prevent duplicate fetches
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!open || !currentOrg) {
        hasFetchedRef.current = false;
        return;
      }
      
      // Prevent duplicate fetches while dialog is open
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: employees } = await supabase
        .from("employees")
        .select(`
          id,
          user_id,
          profiles!employees_user_id_fkey (full_name, avatar_url)
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .neq("user_id", user.id);

      if (employees) {
        setTeamMembers(employees as TeamMember[]);
      }
    };

    fetchTeamMembers();
  }, [open, currentOrg?.id]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (employeeId: string): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
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
    setErrors({});

    if (!selectedType || selectedType === "kudos") return;

    try {
      const validated = updateSchema.parse({ ...formData, type: selectedType });
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to post",
          variant: "destructive",
        });
        return;
      }

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (employeeError || !employee) {
        toast({
          title: "Error",
          description: "You need to create your employee profile first",
          variant: "destructive",
        });
        return;
      }

      // Upload image if present
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(employee.id);
      }

      // Map announcement to update type for database compatibility
      const dbType = validated.type === "announcement" ? "update" : validated.type;

      const { data: insertedUpdate, error } = await supabase.from("updates").insert({
        employee_id: employee.id,
        content: validated.content,
        type: dbType,
        organization_id: employee.organization_id,
        image_url: imageUrl,
      }).select("id").single();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Insert mentions if any selected
        if (insertedUpdate && selectedMembers.length > 0) {
          const mentionsToInsert = selectedMembers.map(memberId => ({
            update_id: insertedUpdate.id,
            employee_id: memberId,
            organization_id: employee.organization_id,
          }));
          await supabase.from("update_mentions").insert(mentionsToInsert);
        }

        toast({
          title: "Posted! 🎉",
          description: validated.type === "announcement" 
            ? "Your announcement has been shared with the team"
            : "Your update has been shared with the team",
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ content: "" });
    setSelectedType(null);
    setImageFile(null);
    setImagePreview(null);
    setSelectedMembers([]);
    setMemberSelectOpen(false);
    setSearchQuery("");
    setErrors({});
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const postTypes = [
    { type: "win" as const, icon: Trophy, label: "Win", color: "amber" },
    ...(canPostAnnouncement ? [{ type: "announcement" as const, icon: Megaphone, label: "Announcement", color: "blue" }] : []),
    { type: "kudos" as const, icon: Heart, label: "Kudos", color: "pink" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedType === "win" ? "Posting a Win" : 
             selectedType === "announcement" ? "Posting an Announcement" : 
             selectedType === "kudos" ? "Give Kudos" : "Share with Team"}
          </DialogTitle>
        </DialogHeader>

        {/* Post Type Selection */}
        {!selectedType && (
          <div className="space-y-3">
            <Label>What would you like to share?</Label>
            <div className="grid grid-cols-3 gap-2">
              {postTypes.map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary",
                    "bg-muted/30 border-border"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-full",
                    color === "amber" && "bg-amber-100 text-amber-600",
                    color === "blue" && "bg-blue-100 text-blue-600",
                    color === "pink" && "bg-pink-100 text-pink-600",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Win/Announcement Form */}
        {selectedType && selectedType !== "kudos" && (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {selectedType === "announcement" ? "Announcement" : "Your Win"} *
                </Label>
                <AIWritingAssist
                  type={selectedType}
                  currentText={formData.content}
                  onTextGenerated={(text) => setFormData({ ...formData, content: text })}
                />
              </div>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder={
                  selectedType === "announcement"
                    ? "Share an important announcement with the team..."
                    : "Share your win or achievement with the team..."
                }
                minHeight="100px"
              />
              {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Add Photo (optional)</Label>
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

            {/* Tag Team Members (optional) */}
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
                        .filter(member => member.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => toggleMember(member.id)}
                          >
                            <Checkbox
                              checked={selectedMembers.includes(member.id)}
                              className="pointer-events-none"
                            />
                            <Avatar className="h-6 w-6">
                              {member.profiles.avatar_url && <AvatarImage src={member.profiles.avatar_url} />}
                              <AvatarFallback className="text-xs bg-muted">
                                {member.profiles.full_name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.profiles.full_name}</span>
                          </div>
                        ))}
                      {teamMembers.filter(member => member.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No team members found</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedMembers.map(memberId => {
                    const member = teamMembers.find(m => m.id === memberId);
                    if (!member) return null;
                    return (
                      <Badge key={memberId} variant="secondary" className="gap-1">
                        {member.profiles.full_name}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => toggleMember(memberId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Posting..." : "Post"}
              </Button>
            </div>
          </form>
        )}

        {/* Kudos Form */}
        {selectedType === "kudos" && (
          <GiveKudosDialogContent 
            onBack={() => setSelectedType(null)}
            onSuccess={() => {
              resetForm();
              onOpenChange(false);
              onSuccess?.();
            }}
            onCancel={() => handleClose(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};