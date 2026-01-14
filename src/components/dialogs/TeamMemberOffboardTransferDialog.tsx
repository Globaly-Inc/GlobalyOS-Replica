import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEmployeeOffboardData, useOffboardTransferActions, OffboardData } from "@/hooks/useEmployeeOffboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2, FileText, FolderOpen, ListTodo, Users, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, FolderKanban, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TeamMemberOffboardTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  mode: "deactivate" | "delete";
  onComplete: () => void;
  onSkip: () => void;
}

type Step = "summary" | "wiki" | "tasks" | "reports" | "projects" | "kpis" | "confirm";

export function TeamMemberOffboardTransferDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  mode,
  onComplete,
  onSkip,
}: TeamMemberOffboardTransferDialogProps) {
  const { data: offboardData, isLoading, refetch } = useEmployeeOffboardData(employeeId);
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const { 
    transferWikiItems, 
    reassignTasks, 
    reassignDirectReports,
    transferProjectLeads,
    transferIndividualKpis,
    transferKpiOwnership,
  } = useOffboardTransferActions();

  const [currentStep, setCurrentStep] = useState<Step>("summary");
  const [processing, setProcessing] = useState(false);

  // Selected transfer targets
  const [wikiNewOwnerId, setWikiNewOwnerId] = useState<string>("");
  const [tasksNewAssigneeId, setTasksNewAssigneeId] = useState<string>("");
  const [reportsNewManagerId, setReportsNewManagerId] = useState<string>("");
  const [projectsNewLeadId, setProjectsNewLeadId] = useState<string>("");
  const [kpisNewOwnerId, setKpisNewOwnerId] = useState<string>("");

  // Track completed transfers
  const [wikiTransferred, setWikiTransferred] = useState(false);
  const [tasksReassigned, setTasksReassigned] = useState(false);
  const [reportsReassigned, setReportsReassigned] = useState(false);
  const [projectsTransferred, setProjectsTransferred] = useState(false);
  const [kpisTransferred, setKpisTransferred] = useState(false);

  // Fetch active employees for selection (excluding the one being offboarded)
  const { data: activeEmployees = [] } = useQuery({
    queryKey: ["active-employees-for-transfer", currentOrg?.id, employeeId],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          position,
          user_id,
          profiles!employees_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .neq("id", employeeId);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentOrg?.id,
  });

  const hasWikiItems = (offboardData?.wiki_pages?.length || 0) + (offboardData?.wiki_folders?.length || 0) > 0;
  const hasTasks = (offboardData?.pending_tasks?.length || 0) > 0;
  const hasReports = (offboardData?.direct_reports?.length || 0) > 0;
  const hasProjects = (offboardData?.led_projects?.length || 0) > 0;
  const hasKpis = (offboardData?.individual_kpis?.length || 0) + (offboardData?.owned_kpis?.length || 0) > 0;
  const hasAnyItems = hasWikiItems || hasTasks || hasReports || hasProjects || hasKpis;

  const steps = useMemo(() => {
    const s: Step[] = ["summary"];
    if (hasWikiItems) s.push("wiki");
    if (hasTasks) s.push("tasks");
    if (hasReports) s.push("reports");
    if (hasProjects) s.push("projects");
    if (hasKpis) s.push("kpis");
    s.push("confirm");
    return s;
  }, [hasWikiItems, hasTasks, hasReports, hasProjects, hasKpis]);

  const currentStepIndex = steps.indexOf(currentStep);

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const handleTransferWiki = async () => {
    if (!wikiNewOwnerId || !offboardData) return;
    setProcessing(true);
    try {
      const pageIds = offboardData.wiki_pages.map(p => p.id);
      const folderIds = offboardData.wiki_folders.map(f => f.id);
      await transferWikiItems(pageIds, folderIds, wikiNewOwnerId);
      setWikiTransferred(true);
      toast({ title: "Wiki items transferred", description: "All wiki pages and folders have been transferred." });
      goNext();
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReassignTasks = async () => {
    if (!offboardData) return;
    setProcessing(true);
    try {
      const taskIds = offboardData.pending_tasks.map(t => t.id);
      await reassignTasks(taskIds, tasksNewAssigneeId || null);
      setTasksReassigned(true);
      toast({ title: "Tasks reassigned", description: tasksNewAssigneeId ? "All tasks have been reassigned." : "All tasks have been unassigned." });
      goNext();
    } catch (err: any) {
      toast({ title: "Reassignment failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReassignReports = async () => {
    if (!offboardData) return;
    setProcessing(true);
    try {
      const employeeIds = offboardData.direct_reports.map(r => r.id);
      await reassignDirectReports(employeeIds, reportsNewManagerId || null);
      setReportsReassigned(true);
      toast({ title: "Direct reports reassigned", description: reportsNewManagerId ? "All direct reports have been reassigned." : "Direct reports now have no manager." });
      goNext();
    } catch (err: any) {
      toast({ title: "Reassignment failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferProjects = async () => {
    if (!offboardData) return;
    setProcessing(true);
    try {
      const leadProjects = offboardData.led_projects.filter(p => p.role === 'lead').map(p => p.id);
      const secondaryProjects = offboardData.led_projects.filter(p => p.role === 'secondary').map(p => p.id);
      
      if (leadProjects.length > 0) {
        await transferProjectLeads(leadProjects, 'lead', projectsNewLeadId || null);
      }
      if (secondaryProjects.length > 0) {
        await transferProjectLeads(secondaryProjects, 'secondary', projectsNewLeadId || null);
      }
      
      setProjectsTransferred(true);
      toast({ title: "Project leadership transferred", description: projectsNewLeadId ? "Project leads have been transferred." : "Project leads have been removed." });
      goNext();
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferKpis = async () => {
    if (!offboardData || !kpisNewOwnerId) return;
    setProcessing(true);
    try {
      // Transfer individual KPIs
      if (offboardData.individual_kpis.length > 0) {
        const kpiIds = offboardData.individual_kpis.map(k => k.id);
        await transferIndividualKpis(kpiIds, kpisNewOwnerId);
      }
      
      // Transfer KPI ownership
      if (offboardData.owned_kpis.length > 0) {
        const kpiIds = offboardData.owned_kpis.map(k => k.id);
        await transferKpiOwnership(kpiIds, employeeId, kpisNewOwnerId);
      }
      
      setKpisTransferred(true);
      toast({ title: "KPIs transferred", description: "All KPIs have been transferred to the new owner." });
      goNext();
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalConfirm = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const getEmployeeName = (emp: typeof activeEmployees[0]) => {
    return emp.profiles?.full_name || "Unknown";
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, idx) => (
        <div
          key={step}
          className={cn(
            "h-2 rounded-full transition-all",
            idx === currentStepIndex ? "w-6 bg-primary" : "w-2 bg-muted"
          )}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "delete" ? "Transfer Items Before Deletion" : "Transfer Items Before Deactivation"}
          </DialogTitle>
          <DialogDescription>
            Review and transfer {employeeName}'s assigned items to another team member.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {/* Summary Step */}
        {currentStep === "summary" && (
          <div className="space-y-4">
            {!hasAnyItems ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No items need to be transferred. You can proceed with {mode === "delete" ? "deletion" : "deactivation"}.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Items require transfer
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        The following items are assigned to {employeeName} and should be transferred before {mode === "delete" ? "deletion" : "deactivation"}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {hasWikiItems && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Wiki Items</p>
                        <p className="text-sm text-muted-foreground">
                          {offboardData?.wiki_pages?.length || 0} pages, {offboardData?.wiki_folders?.length || 0} folders
                        </p>
                      </div>
                      {wikiTransferred && <Badge variant="secondary" className="bg-green-100 text-green-700">Transferred</Badge>}
                    </div>
                  )}
                  {hasTasks && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <ListTodo className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Pending Tasks</p>
                        <p className="text-sm text-muted-foreground">
                          {offboardData?.pending_tasks?.length || 0} tasks
                        </p>
                      </div>
                      {tasksReassigned && <Badge variant="secondary" className="bg-green-100 text-green-700">Reassigned</Badge>}
                    </div>
                  )}
                  {hasReports && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Direct Reports</p>
                        <p className="text-sm text-muted-foreground">
                          {offboardData?.direct_reports?.length || 0} team members
                        </p>
                      </div>
                      {reportsReassigned && <Badge variant="secondary" className="bg-green-100 text-green-700">Reassigned</Badge>}
                    </div>
                  )}
                  {hasProjects && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Project Leadership</p>
                        <p className="text-sm text-muted-foreground">
                          {offboardData?.led_projects?.length || 0} projects
                        </p>
                      </div>
                      {projectsTransferred && <Badge variant="secondary" className="bg-green-100 text-green-700">Transferred</Badge>}
                    </div>
                  )}
                  {hasKpis && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">KPIs</p>
                        <p className="text-sm text-muted-foreground">
                          {offboardData?.individual_kpis?.length || 0} individual, {offboardData?.owned_kpis?.length || 0} shared
                        </p>
                      </div>
                      {kpisTransferred && <Badge variant="secondary" className="bg-green-100 text-green-700">Transferred</Badge>}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {hasAnyItems ? (
                <>
                  <Button variant="outline" onClick={handleSkip} className="flex-1">
                    Skip & Proceed
                  </Button>
                  <Button onClick={goNext} className="flex-1">
                    Start Transfer
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <Button onClick={handleFinalConfirm} className="w-full">
                  Continue with {mode === "delete" ? "Deletion" : "Deactivation"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Wiki Transfer Step */}
        {currentStep === "wiki" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Transfer wiki items to:</Label>
              <Select value={wikiNewOwnerId} onValueChange={setWikiNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new owner" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getEmployeeName(emp).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{getEmployeeName(emp)}</span>
                        {emp.position && <span className="text-muted-foreground">- {emp.position}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {offboardData?.wiki_pages?.map((page) => (
                <div key={page.id} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{page.title}</span>
                </div>
              ))}
              {offboardData?.wiki_folders?.map((folder) => (
                <div key={folder.id} className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{folder.name}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={goNext}>
                Skip
              </Button>
              <Button onClick={handleTransferWiki} disabled={!wikiNewOwnerId || processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Transfer All
              </Button>
            </div>
          </div>
        )}

        {/* Tasks Reassignment Step */}
        {currentStep === "tasks" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Reassign tasks to:</Label>
              <Select value={tasksNewAssigneeId} onValueChange={setTasksNewAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new assignee (or leave empty to unassign)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassign (no one)</SelectItem>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getEmployeeName(emp).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{getEmployeeName(emp)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {offboardData?.pending_tasks?.map((task) => (
                <div key={task.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <span>{task.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{task.status}</Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={goNext}>
                Skip
              </Button>
              <Button onClick={handleReassignTasks} disabled={processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {tasksNewAssigneeId ? "Reassign All" : "Unassign All"}
              </Button>
            </div>
          </div>
        )}

        {/* Direct Reports Step */}
        {currentStep === "reports" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Reassign direct reports to:</Label>
              <Select value={reportsNewManagerId} onValueChange={setReportsNewManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new manager (or leave empty for no manager)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No manager</SelectItem>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getEmployeeName(emp).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{getEmployeeName(emp)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {offboardData?.direct_reports?.map((report) => (
                <div key={report.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={report.avatar_url || undefined} />
                    <AvatarFallback>{report.full_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span>{report.full_name}</span>
                  {report.position && <span className="text-muted-foreground">- {report.position}</span>}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={goNext}>
                Skip
              </Button>
              <Button onClick={handleReassignReports} disabled={processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {reportsNewManagerId ? "Reassign All" : "Remove Manager"}
              </Button>
            </div>
          </div>
        )}

        {/* Projects Transfer Step */}
        {currentStep === "projects" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Transfer project leadership to:</Label>
              <Select value={projectsNewLeadId} onValueChange={setProjectsNewLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new lead (or leave empty to remove)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Remove lead</SelectItem>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getEmployeeName(emp).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{getEmployeeName(emp)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {offboardData?.led_projects?.map((project) => (
                <div key={project.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" style={{ color: project.color }} />
                    <span>{project.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {project.role === 'lead' ? 'Lead' : 'Secondary Lead'}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={goNext}>
                Skip
              </Button>
              <Button onClick={handleTransferProjects} disabled={processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {projectsNewLeadId ? "Transfer All" : "Remove Leads"}
              </Button>
            </div>
          </div>
        )}

        {/* KPIs Transfer Step */}
        {currentStep === "kpis" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Transfer KPIs to:</Label>
              <Select value={kpisNewOwnerId} onValueChange={setKpisNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new owner" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{getEmployeeName(emp).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{getEmployeeName(emp)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-3">
              {(offboardData?.individual_kpis?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Individual KPIs</p>
                  <div className="space-y-2">
                    {offboardData?.individual_kpis?.map((kpi) => (
                      <div key={kpi.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{kpi.title}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">Q{kpi.quarter} {kpi.year}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(offboardData?.owned_kpis?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Shared KPI Ownership</p>
                  <div className="space-y-2">
                    {offboardData?.owned_kpis?.map((kpi) => (
                      <div key={kpi.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{kpi.title}</span>
                          {kpi.is_primary && <Badge className="text-xs bg-primary/10 text-primary">Primary</Badge>}
                        </div>
                        <Badge variant="outline" className="text-xs">{kpi.scope_type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={goNext}>
                Skip
              </Button>
              <Button onClick={handleTransferKpis} disabled={!kpisNewOwnerId || processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Transfer All
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {currentStep === "confirm" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">
                Ready to {mode === "delete" ? "delete" : "deactivate"} {employeeName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {wikiTransferred || tasksReassigned || reportsReassigned || projectsTransferred || kpisTransferred
                  ? "Transfers completed. You can now proceed."
                  : "You can proceed with the action."}
              </p>
            </div>

            {(wikiTransferred || tasksReassigned || reportsReassigned || projectsTransferred || kpisTransferred) && (
              <div className="grid gap-2">
                {wikiTransferred && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Wiki items transferred
                  </div>
                )}
                {tasksReassigned && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Tasks reassigned
                  </div>
                )}
                {reportsReassigned && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Direct reports reassigned
                  </div>
                )}
                {projectsTransferred && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Project leadership transferred
                  </div>
                )}
                {kpisTransferred && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    KPIs transferred
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleFinalConfirm}
                className="flex-1"
                variant={mode === "delete" ? "destructive" : "default"}
              >
                {mode === "delete" ? "Proceed with Deletion" : "Proceed with Deactivation"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
