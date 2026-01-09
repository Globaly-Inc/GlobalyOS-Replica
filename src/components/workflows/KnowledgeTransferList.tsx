import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUpdateKnowledgeTransfer, useAddKnowledgeTransfer } from "@/services/useWorkflows";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { KnowledgeTransferWithRecipient, KnowledgeTransferStatus } from "@/types/workflow";
import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Loader2,
} from "lucide-react";

interface KnowledgeTransferListProps {
  transfers: KnowledgeTransferWithRecipient[];
  employeeId: string;
  workflowId?: string;
  canEdit?: boolean;
}

const statusConfig: Record<KnowledgeTransferStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: XCircle },
};

interface TeamMember {
  id: string;
  profiles: { full_name: string; avatar_url: string | null };
}

export function KnowledgeTransferList({ transfers, employeeId, workflowId, canEdit = false }: KnowledgeTransferListProps) {
  const { currentOrg } = useOrganization();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTransfer, setNewTransfer] = useState({
    topic: "",
    description: "",
    recipientId: "",
    scheduledDate: "",
  });

  const updateTransfer = useUpdateKnowledgeTransfer();
  const addTransfer = useAddKnowledgeTransfer();

  useEffect(() => {
    if (addDialogOpen && currentOrg?.id) {
      loadTeamMembers();
    }
  }, [addDialogOpen, currentOrg?.id]);

  const loadTeamMembers = async () => {
    if (!currentOrg?.id) return;
    
    const { data } = await supabase
      .from("employees")
      .select("id, profiles!inner(full_name, avatar_url)")
      .eq("organization_id", currentOrg.id)
      .eq("status", "active")
      .neq("id", employeeId)
      .order("created_at");
    
    if (data) {
      setTeamMembers(data as TeamMember[]);
    }
  };

  const handleStatusChange = (transferId: string, newStatus: KnowledgeTransferStatus) => {
    updateTransfer.mutate({ id: transferId, status: newStatus });
  };

  const handleAddTransfer = () => {
    if (!newTransfer.topic) return;
    
    addTransfer.mutate({
      employeeId,
      workflowId,
      topic: newTransfer.topic,
      description: newTransfer.description || undefined,
      recipientId: newTransfer.recipientId || undefined,
      scheduledDate: newTransfer.scheduledDate || undefined,
    }, {
      onSuccess: () => {
        setAddDialogOpen(false);
        setNewTransfer({ topic: "", description: "", recipientId: "", scheduledDate: "" });
      },
    });
  };

  const completedCount = transfers.filter((t) => t.status === "completed").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Transfer
            </CardTitle>
            <CardDescription>
              Schedule and track knowledge handover sessions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {transfers.length > 0 && (
              <Badge variant="outline">
                {completedCount}/{transfers.length} completed
              </Badge>
            )}
            {canEdit && (
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Schedule Session
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No knowledge transfer sessions scheduled</p>
            {canEdit && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                Schedule First Session
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => {
              const StatusIcon = statusConfig[transfer.status].icon;
              
              return (
                <div
                  key={transfer.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium">{transfer.topic}</h4>
                      {transfer.description && (
                        <p className="text-sm text-muted-foreground mt-1">{transfer.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {transfer.scheduled_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(transfer.scheduled_date), "MMM d, yyyy")}
                          </div>
                        )}
                        {transfer.recipient && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={transfer.recipient.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {transfer.recipient.profiles.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>To: {transfer.recipient.profiles.full_name}</span>
                          </div>
                        )}
                      </div>
                      {transfer.notes && (
                        <p className="text-sm mt-2 p-2 rounded bg-muted/50">{transfer.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && transfer.status === "scheduled" ? (
                        <Select
                          value={transfer.status}
                          onValueChange={(v) => handleStatusChange(transfer.id, v as KnowledgeTransferStatus)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={statusConfig[transfer.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[transfer.status].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Transfer Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Knowledge Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., Client onboarding process"
                value={newTransfer.topic}
                onChange={(e) => setNewTransfer({ ...newTransfer, topic: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What knowledge needs to be transferred?"
                value={newTransfer.description}
                onChange={(e) => setNewTransfer({ ...newTransfer, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Select
                  value={newTransfer.recipientId}
                  onValueChange={(v) => setNewTransfer({ ...newTransfer, recipientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.profiles.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={newTransfer.scheduledDate}
                  onChange={(e) => setNewTransfer({ ...newTransfer, scheduledDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransfer} disabled={!newTransfer.topic || addTransfer.isPending}>
              {addTransfer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
