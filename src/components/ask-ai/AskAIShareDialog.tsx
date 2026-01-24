import { useState, useEffect } from "react";
import { Users, Search, X, Check, Link, Globe, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Participant {
  id: string;
  employee_id: string;
  role: string;
  employee?: TeamMember;
}

interface AskAIShareDialogProps {
  conversationId: string;
  conversationTitle: string;
  isShared: boolean;
  visibility: "private" | "team" | "specific";
  participants: Participant[];
  ownerId: string;
  onShareChange: (isShared: boolean, visibility: "private" | "team" | "specific") => void;
  onParticipantsChange: () => void;
}

export const AskAIShareDialog = ({
  conversationId,
  conversationTitle,
  isShared,
  visibility,
  participants,
  ownerId,
  onShareChange,
  onParticipantsChange,
}: AskAIShareDialogProps) => {
  const { currentOrg } = useOrganization();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTeamShared, setIsTeamShared] = useState(visibility === "team");

  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentOrg?.id || !open) return;
      
      setLoading(true);
      try {
        let query = supabase
          .from("employees")
          .select("id, user_id, profiles(full_name, avatar_url, email)")
          .eq("organization_id", currentOrg.id)
          .eq("status", "active");

        if (search) {
          query = query.ilike("profiles.full_name", `%${search}%`);
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;
        setMembers((data as unknown as TeamMember[]) || []);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [currentOrg?.id, open, search]);

  const participantIds = participants.map((p) => p.employee_id);

  const handleToggleTeamShare = async (enabled: boolean) => {
    setIsTeamShared(enabled);
    const newVisibility = enabled ? "team" : (participants.length > 0 ? "specific" : "private");
    
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .update({
          is_shared: enabled || participants.length > 0,
          visibility: newVisibility,
        })
        .eq("id", conversationId);

      if (error) throw error;
      
      onShareChange(enabled || participants.length > 0, newVisibility);
      toast.success(enabled ? "Shared with team" : "Sharing updated");
    } catch (error) {
      console.error("Failed to update sharing:", error);
      toast.error("Failed to update sharing");
      setIsTeamShared(!enabled);
    }
  };

  const handleAddParticipant = async (member: TeamMember) => {
    if (!currentOrg?.id) return;
    
    try {
      const { error } = await supabase.from("ai_conversation_participants").insert({
        conversation_id: conversationId,
        organization_id: currentOrg.id,
        employee_id: member.id,
        role: "member",
      });

      if (error) throw error;

      // Update conversation to be shared
      if (!isShared) {
        await supabase
          .from("ai_conversations")
          .update({
            is_shared: true,
            visibility: "specific",
          })
          .eq("id", conversationId);
        
        onShareChange(true, "specific");
      }

      onParticipantsChange();
      toast.success(`Added ${member.profiles.full_name}`);
    } catch (error) {
      console.error("Failed to add participant:", error);
      toast.error("Failed to add participant");
    }
  };

  const handleRemoveParticipant = async (participantId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversation_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;

      onParticipantsChange();
      toast.success(`Removed ${memberName}`);
    } catch (error) {
      console.error("Failed to remove participant:", error);
      toast.error("Failed to remove participant");
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/ask-ai?c=${conversationId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <Users className="h-4 w-4" />
          {isShared && <span className="text-xs">{participants.length + 1}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Conversation
          </DialogTitle>
          <DialogDescription>
            Share "{conversationTitle}" with your team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Share Options */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Share with entire team</Label>
                <p className="text-xs text-muted-foreground">
                  Everyone in the organization can view and participate
                </p>
              </div>
            </div>
            <Switch
              checked={isTeamShared}
              onCheckedChange={handleToggleTeamShare}
            />
          </div>

          <Separator />

          {/* Add Specific People */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add specific people
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Current Participants */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Current participants</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <Badge
                      key={p.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {p.employee?.profiles.full_name || "Unknown"}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 hover:bg-transparent"
                        onClick={() =>
                          handleRemoveParticipant(
                            p.id,
                            p.employee?.profiles.full_name || "Unknown"
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Loading...
                  </p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members found
                  </p>
                ) : (
                  members
                    .filter((m) => m.user_id !== ownerId)
                    .map((member) => {
                      const isParticipant = participantIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            isParticipant
                              ? "bg-primary/10 cursor-default"
                              : "hover:bg-accent"
                          )}
                          onClick={() =>
                            !isParticipant && handleAddParticipant(member)
                          }
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.profiles.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.profiles.full_name}
                            </p>
                          </div>
                          {isParticipant && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Copy Link */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleCopyLink}
          >
            <Link className="h-4 w-4" />
            Copy conversation link
          </Button>

          {/* Privacy Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Shared conversations allow team members to send messages to AI and add internal notes.
              Internal notes are never sent to the AI.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
