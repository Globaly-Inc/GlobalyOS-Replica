import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Users, 
  Briefcase, 
  FolderKanban, 
  Globe, 
  Eye, 
  Pencil,
  Copy,
  Check,
  Loader2,
  Link2,
  UserPlus,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { WikiMembersWithAccess, MemberWithAccess } from "./WikiMembersWithAccess";
import { WikiInviteMember } from "./WikiInviteMember";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type WikiAccessScope = 'company' | 'offices' | 'departments' | 'projects' | 'members' | 'public';
export type WikiPermissionLevel = 'view' | 'edit';

interface WikiShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "folder" | "page";
  itemId: string;
  itemName: string;
  organizationId: string;
  currentFolderId?: string | null;
}

interface Office {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  user_id: string;
  office_id?: string | null;
  department?: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

export const WikiShareDialog = ({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  organizationId,
  currentFolderId,
}: WikiShareDialogProps) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  
  // Main state
  const [accessScope, setAccessScope] = useState<WikiAccessScope>('company');
  const [permissionLevel, setPermissionLevel] = useState<WikiPermissionLevel>('view');
  const [inheritFromFolder, setInheritFromFolder] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkAccessExpanded, setLinkAccessExpanded] = useState(false);

  // Members with access
  const [membersWithAccess, setMembersWithAccess] = useState<MemberWithAccess[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Selection states
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Available options
  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Load available options and current permissions
  useEffect(() => {
    if (open && organizationId) {
      loadOptions();
      loadCurrentPermissions();
      loadMembersWithAccess();
    }
  }, [open, organizationId, itemId, itemType]);

  const loadOptions = async () => {
    try {
      // Load offices
      const { data: officesData } = await supabase
        .from('offices')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');
      setOffices(officesData || []);

      // Load departments from employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('department')
        .eq('organization_id', organizationId);
      const uniqueDepts = [...new Set(employeesData?.map(e => e.department).filter(Boolean) || [])];
      setDepartments(uniqueDepts.sort());

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');
      setProjects(projectsData || []);

      // Load employees for member selection with email, office, department
      const { data: empsData } = await supabase
        .from('employees')
        .select('id, user_id, office_id, department, profiles(full_name, avatar_url, email)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('profiles(full_name)');
      setEmployees(empsData as Employee[] || []);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadCurrentPermissions = async () => {
    setIsLoading(true);
    try {
      const table = itemType === 'folder' ? 'wiki_folders' : 'wiki_pages';
      const { data: itemData, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', itemId)
        .single();

      if (!error && itemData) {
        const data = itemData as Record<string, unknown>;
        setAccessScope((data.access_scope as WikiAccessScope) || 'company');
        setPermissionLevel((data.permission_level as WikiPermissionLevel) || 'view');
        if (itemType === 'page' && 'inherit_from_folder' in data) {
          setInheritFromFolder(data.inherit_from_folder as boolean ?? true);
        }
      }

      // Load junction table data based on scope
      await loadJunctionData();
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembersWithAccess = async () => {
    setIsMembersLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_wiki_item_members', {
        _item_type: itemType,
        _item_id: itemId,
      });

      if (error) throw error;
      setMembersWithAccess((data as MemberWithAccess[]) || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const loadJunctionData = async () => {
    try {
      if (itemType === 'folder') {
        const { data: officeData } = await supabase
          .from('wiki_folder_offices')
          .select('office_id')
          .eq('folder_id', itemId);
        setSelectedOffices(officeData?.map(o => o.office_id) || []);

        const { data: deptData } = await supabase
          .from('wiki_folder_departments')
          .select('department')
          .eq('folder_id', itemId);
        setSelectedDepartments(deptData?.map(d => d.department) || []);

        const { data: projData } = await supabase
          .from('wiki_folder_projects')
          .select('project_id')
          .eq('folder_id', itemId);
        setSelectedProjects(projData?.map(p => p.project_id) || []);
      } else {
        const { data: officeData } = await supabase
          .from('wiki_page_offices')
          .select('office_id')
          .eq('page_id', itemId);
        setSelectedOffices(officeData?.map(o => o.office_id) || []);

        const { data: deptData } = await supabase
          .from('wiki_page_departments')
          .select('department')
          .eq('page_id', itemId);
        setSelectedDepartments(deptData?.map(d => d.department) || []);

        const { data: projData } = await supabase
          .from('wiki_page_projects')
          .select('project_id')
          .eq('page_id', itemId);
        setSelectedProjects(projData?.map(p => p.project_id) || []);
      }
    } catch (error) {
      console.error('Error loading junction data:', error);
    }
  };

  const handleInviteMembers = async (employeeIds: string[], permission: 'view' | 'edit') => {
    if (!currentEmployee?.id) return;
    
    setIsInviting(true);
    try {
      let error: unknown = null;
      
      if (itemType === 'folder') {
        const insertData = employeeIds.map(empId => ({
          folder_id: itemId,
          employee_id: empId,
          permission,
          organization_id: organizationId,
          added_by: currentEmployee.id,
        }));
        const result = await supabase.from('wiki_folder_members').insert(insertData);
        error = result.error;
      } else {
        const insertData = employeeIds.map(empId => ({
          page_id: itemId,
          employee_id: empId,
          permission,
          organization_id: organizationId,
          added_by: currentEmployee.id,
        }));
        const result = await supabase.from('wiki_page_members').insert(insertData);
        error = result.error;
      }
      if (error) throw error;

      toast.success(`${employeeIds.length} member${employeeIds.length > 1 ? 's' : ''} added`);
      loadMembersWithAccess();
    } catch (error) {
      console.error('Error inviting members:', error);
      toast.error('Failed to add members');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateMemberPermission = async (employeeId: string, permission: 'view' | 'edit') => {
    setUpdatingMemberId(employeeId);
    try {
      let error: unknown = null;
      
      if (itemType === 'folder') {
        const result = await supabase
          .from('wiki_folder_members')
          .update({ permission })
          .eq('folder_id', itemId)
          .eq('employee_id', employeeId);
        error = result.error;
      } else {
        const result = await supabase
          .from('wiki_page_members')
          .update({ permission })
          .eq('page_id', itemId)
          .eq('employee_id', employeeId);
        error = result.error;
      }

      if (error) throw error;

      setMembersWithAccess(prev =>
        prev.map(m => m.employee_id === employeeId ? { ...m, permission } : m)
      );
      toast.success('Permission updated');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    setUpdatingMemberId(employeeId);
    try {
      let error: unknown = null;
      
      if (itemType === 'folder') {
        const result = await supabase
          .from('wiki_folder_members')
          .delete()
          .eq('folder_id', itemId)
          .eq('employee_id', employeeId);
        error = result.error;
      } else {
        const result = await supabase
          .from('wiki_page_members')
          .delete()
          .eq('page_id', itemId)
          .eq('employee_id', employeeId);
        error = result.error;
      }

      if (error) throw error;

      setMembersWithAccess(prev => prev.filter(m => m.employee_id !== employeeId));
      toast.success('Member removed');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleSaveAccessScope = async () => {
    setIsSaving(true);
    try {
      // Update main table
      if (itemType === 'folder') {
        await supabase
          .from('wiki_folders')
          .update({
            access_scope: accessScope,
            permission_level: permissionLevel,
          })
          .eq('id', itemId);

        // Clear existing junction data (except members)
        await Promise.all([
          supabase.from('wiki_folder_offices').delete().eq('folder_id', itemId),
          supabase.from('wiki_folder_departments').delete().eq('folder_id', itemId),
          supabase.from('wiki_folder_projects').delete().eq('folder_id', itemId),
        ]);

        // Insert new junction data based on scope
        if (accessScope === 'offices' && selectedOffices.length > 0) {
          await supabase.from('wiki_folder_offices').insert(
            selectedOffices.map(officeId => ({
              folder_id: itemId,
              office_id: officeId,
              organization_id: organizationId,
            }))
          );
        }

        if (accessScope === 'departments' && selectedDepartments.length > 0) {
          await supabase.from('wiki_folder_departments').insert(
            selectedDepartments.map(dept => ({
              folder_id: itemId,
              department: dept,
              organization_id: organizationId,
            }))
          );
        }

        if (accessScope === 'projects' && selectedProjects.length > 0) {
          await supabase.from('wiki_folder_projects').insert(
            selectedProjects.map(projectId => ({
              folder_id: itemId,
              project_id: projectId,
              organization_id: organizationId,
            }))
          );
        }
      } else {
        // Page updates
        await supabase
          .from('wiki_pages')
          .update({
            access_scope: accessScope,
            permission_level: permissionLevel,
            inherit_from_folder: inheritFromFolder,
          })
          .eq('id', itemId);

        // Clear existing junction data (except members)
        await Promise.all([
          supabase.from('wiki_page_offices').delete().eq('page_id', itemId),
          supabase.from('wiki_page_departments').delete().eq('page_id', itemId),
          supabase.from('wiki_page_projects').delete().eq('page_id', itemId),
        ]);

        // Insert new junction data based on scope
        if (accessScope === 'offices' && selectedOffices.length > 0) {
          await supabase.from('wiki_page_offices').insert(
            selectedOffices.map(officeId => ({
              page_id: itemId,
              office_id: officeId,
              organization_id: organizationId,
            }))
          );
        }

        if (accessScope === 'departments' && selectedDepartments.length > 0) {
          await supabase.from('wiki_page_departments').insert(
            selectedDepartments.map(dept => ({
              page_id: itemId,
              department: dept,
              organization_id: organizationId,
            }))
          );
        }

        if (accessScope === 'projects' && selectedProjects.length > 0) {
          await supabase.from('wiki_page_projects').insert(
            selectedProjects.map(projectId => ({
              page_id: itemId,
              project_id: projectId,
              organization_id: organizationId,
            }))
          );
        }
      }

      toast.success('Access settings saved');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to update access settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/org/${currentOrg?.slug}/wiki/${itemType}/${itemId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelection = (
    id: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const scopeOptions = [
    { value: 'company' as const, label: 'Company-wide', description: 'Everyone in the organization', icon: Building2 },
    { value: 'offices' as const, label: 'Offices', description: 'Restrict to specific offices', icon: Building2 },
    { value: 'departments' as const, label: 'Departments', description: 'Restrict to specific departments', icon: Users },
    { value: 'projects' as const, label: 'Projects', description: 'Restrict to project members', icon: FolderKanban },
    { value: 'members' as const, label: 'Specific Members', description: 'Only invited members', icon: Briefcase },
    { value: 'public' as const, label: 'Public', description: 'Anyone with the link', icon: Globe },
  ];

  const excludedEmployeeIds = membersWithAccess.map(m => m.employee_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Share "{itemName}"</DialogTitle>
              <DialogDescription>
                Collaborate with members on this {itemType}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-y-auto px-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            <div className="space-y-6 pb-6">
              {/* Invite Members Section */}
              <WikiInviteMember
                employees={employees}
                offices={offices}
                departments={departments}
                projects={projects}
                excludedEmployeeIds={excludedEmployeeIds}
                onInvite={handleInviteMembers}
                isInviting={isInviting}
              />

              {/* Members with Access Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Members with access</Label>
                <WikiMembersWithAccess
                  members={membersWithAccess}
                  isLoading={isMembersLoading}
                  onUpdatePermission={handleUpdateMemberPermission}
                  onRemoveMember={handleRemoveMember}
                  isUpdating={updatingMemberId}
                />
              </div>

              <Separator />

              {/* Access Scope Tabs */}
              <Tabs defaultValue="access" className="w-full">
                <TabsList className="w-full grid grid-cols-1">
                  <TabsTrigger value="access" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Who can access
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="access" className="mt-4 space-y-4">
                  {/* Permission Level */}
                  <div className="space-y-3">
                    <Label className="text-sm">Default Permission Level</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={permissionLevel === 'view' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPermissionLevel('view')}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Only
                      </Button>
                      <Button
                        variant={permissionLevel === 'edit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPermissionLevel('edit')}
                        className="flex-1"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Can Edit
                      </Button>
                    </div>
                  </div>

                  {/* Access Scope Radio */}
                  <div className="space-y-3">
                    <Label className="text-sm">Access Scope</Label>
                    <RadioGroup value={accessScope} onValueChange={(v) => setAccessScope(v as WikiAccessScope)}>
                      <div className="space-y-2">
                        {scopeOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <div key={option.value} className="space-y-2">
                              <label
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                  accessScope === option.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <RadioGroupItem value={option.value} />
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{option.label}</span>
                                  <p className="text-xs text-muted-foreground">{option.description}</p>
                                </div>
                              </label>

                              {/* Selection lists */}
                              {accessScope === option.value && option.value === 'offices' && (
                                <div className="ml-8 p-3 bg-muted/50 rounded-lg space-y-2">
                                  {offices.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No offices configured</p>
                                  ) : (
                                    offices.map((office) => (
                                      <label key={office.id} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={selectedOffices.includes(office.id)}
                                          onCheckedChange={() => toggleSelection(office.id, selectedOffices, setSelectedOffices)}
                                        />
                                        <span className="text-sm">{office.name}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              )}

                              {accessScope === option.value && option.value === 'departments' && (
                                <div className="ml-8 p-3 bg-muted/50 rounded-lg space-y-2">
                                  {departments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No departments found</p>
                                  ) : (
                                    departments.map((dept) => (
                                      <label key={dept} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={selectedDepartments.includes(dept)}
                                          onCheckedChange={() => toggleSelection(dept, selectedDepartments, setSelectedDepartments)}
                                        />
                                        <span className="text-sm">{dept}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              )}

                              {accessScope === option.value && option.value === 'projects' && (
                                <div className="ml-8 p-3 bg-muted/50 rounded-lg space-y-2">
                                  {projects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No projects configured</p>
                                  ) : (
                                    projects.map((project) => (
                                      <label key={project.id} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={selectedProjects.includes(project.id)}
                                          onCheckedChange={() => toggleSelection(project.id, selectedProjects, setSelectedProjects)}
                                        />
                                        <span className="text-sm">{project.name}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Inherit from folder option (pages only) */}
                  {itemType === 'page' && currentFolderId && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={inheritFromFolder}
                        onCheckedChange={(checked) => setInheritFromFolder(checked as boolean)}
                      />
                      <span className="text-sm">Inherit permissions from parent folder</span>
                    </label>
                  )}

                  {/* Save Access Settings Button */}
                  <Button 
                    onClick={handleSaveAccessScope} 
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Access Settings'
                    )}
                  </Button>
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Members with link section */}
              <Collapsible open={linkAccessExpanded} onOpenChange={setLinkAccessExpanded}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-3 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm">Members with link</span>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          linkAccessExpanded && "rotate-180"
                        )} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Members who have the link have access to this {itemType}.
                      </p>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-muted/50 rounded-md text-sm text-muted-foreground truncate">
                      {window.location.origin}/org/{currentOrg?.slug}/wiki/{itemType}/{itemId}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="shrink-0 gap-2"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
