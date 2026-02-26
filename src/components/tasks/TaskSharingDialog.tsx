import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, UserPlus, Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useUserRole } from '@/hooks/useUserRole';
import { TaskInviteMember, type Selection } from './TaskInviteMember';
import { TaskMembersWithAccess, type TaskMemberWithAccess, type TaskOwnerInfo } from './TaskMembersWithAccess';
import { TaskTransferOwnershipDialog } from './TaskTransferOwnershipDialog';

type TaskAccessScope = 'company' | 'offices' | 'departments' | 'projects' | 'members';
type TaskPermLevel = 'view' | 'edit' | 'admin';

interface TaskSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'space' | 'folder' | 'list';
  entityId: string;
  entityName: string;
}

interface Office { id: string; name: string; }
interface Project { id: string; name: string; }
interface Employee {
  id: string;
  user_id: string;
  office_id?: string | null;
  department?: string | null;
  profiles: { full_name: string; avatar_url: string | null; email?: string; };
}

const ENTITY_LABELS = { space: 'Space', folder: 'Folder', list: 'Task List' };

const TABLE_MAP = {
  space: 'task_spaces',
  folder: 'task_folders',
  list: 'task_lists',
} as const;

export const TaskSharingDialog = ({ open, onOpenChange, entityType, entityId, entityName }: TaskSharingDialogProps) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const { isOwner, isAdmin } = useUserRole();
  const organizationId = currentOrg?.id;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const [accessScope, setAccessScope] = useState<TaskAccessScope>('company');
  const [permissionLevel, setPermissionLevel] = useState<TaskPermLevel>('edit');

  const [owner, setOwner] = useState<TaskOwnerInfo | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const [membersWithAccess, setMembersWithAccess] = useState<TaskMemberWithAccess[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(true);

  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeProjects, setEmployeeProjects] = useState<{ employee_id: string; project_id: string }[]>([]);

  // Stats for spaces/folders
  const [entityStats, setEntityStats] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; action: () => Promise<void>;
  }>({ open: false, title: '', description: '', action: async () => {} });

  // Load everything on open
  useEffect(() => {
    if (open && organizationId) {
      loadOptions();
      loadCurrentPermissions();
      loadMembersWithAccess();
      loadOwner();
      loadEntityStats();
    }
  }, [open, organizationId, entityId, entityType]);

  const loadEntityStats = async () => {
    if (entityType === 'space') {
      const [{ count: folders }, { count: lists }] = await Promise.all([
        supabase.from('task_folders').select('*', { count: 'exact', head: true }).eq('space_id', entityId),
        supabase.from('task_lists').select('*', { count: 'exact', head: true }).eq('space_id', entityId),
      ]);
      setEntityStats(`Contains ${folders || 0} folder${folders !== 1 ? 's' : ''} and ${lists || 0} list${lists !== 1 ? 's' : ''}.`);
    } else if (entityType === 'folder') {
      const { count: lists } = await supabase.from('task_lists').select('*', { count: 'exact', head: true }).eq('folder_id', entityId);
      setEntityStats(`Contains ${lists || 0} task list${lists !== 1 ? 's' : ''}.`);
    } else {
      const { count: tasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('list_id', entityId);
      setEntityStats(`Contains ${tasks || 0} task${tasks !== 1 ? 's' : ''}.`);
    }
  };

  const loadOwner = async () => {
    try {
      const table = TABLE_MAP[entityType];
      const { data: itemData } = await supabase
        .from(table)
        .select('created_by')
        .eq('id', entityId)
        .single();

      if (!itemData?.created_by) return;

      const { data: empData } = await supabase
        .from('employee_directory')
        .select('id, user_id, full_name, avatar_url, email')
        .eq('id', itemData.created_by)
        .single();

      if (empData) {
        setOwner({
          employee_id: empData.id || '',
          full_name: empData.full_name || 'Unknown',
          avatar_url: empData.avatar_url || null,
          email: empData.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading owner:', error);
    }
  };

  const loadOptions = async () => {
    if (!organizationId) return;
    try {
      const [officesRes, empsRes, projectsRes, empProjRes] = await Promise.all([
        supabase.from('offices').select('id, name').eq('organization_id', organizationId).order('name'),
        supabase.from('employee_directory').select('id, user_id, office_id, department, full_name, avatar_url, email')
          .eq('organization_id', organizationId).eq('status', 'active').order('full_name'),
        supabase.from('projects').select('id, name').eq('organization_id', organizationId).order('name'),
        supabase.from('employee_projects').select('employee_id, project_id').eq('organization_id', organizationId),
      ]);

      setOffices(officesRes.data || []);
      setProjects(projectsRes.data || []);
      setEmployeeProjects(empProjRes.data || []);

      const transformedEmps = (empsRes.data || [])
        .filter(emp => emp.id && emp.user_id)
        .map(emp => ({
          id: emp.id!, user_id: emp.user_id!, office_id: emp.office_id, department: emp.department,
          profiles: { full_name: emp.full_name || '', avatar_url: emp.avatar_url, email: emp.email || undefined },
        }));
      setEmployees(transformedEmps);

      const uniqueDepts = [...new Set(transformedEmps.map(e => e.department).filter(Boolean) as string[])].sort();
      setDepartments(uniqueDepts);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadCurrentPermissions = async () => {
    setIsLoading(true);
    try {
      const table = TABLE_MAP[entityType];
      const { data: itemData } = await supabase.from(table).select('access_scope').eq('id', entityId).single();

      if (itemData) {
        setAccessScope((itemData as any).access_scope || 'company');
      }

      // Load junction data
      const [officeRes, deptRes, projRes] = await Promise.all([
        supabase.from('task_entity_offices').select('office_id').eq('entity_type', entityType).eq('entity_id', entityId),
        supabase.from('task_entity_departments').select('department').eq('entity_type', entityType).eq('entity_id', entityId),
        supabase.from('task_entity_projects').select('project_id').eq('entity_type', entityType).eq('entity_id', entityId),
      ]);

      setSelectedOffices(officeRes.data?.map(o => o.office_id) || []);
      setSelectedDepartments(deptRes.data?.map(d => d.department) || []);
      setSelectedProjects(projRes.data?.map(p => p.project_id) || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembersWithAccess = async () => {
    setIsMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_sharing_permissions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;

      const empIds = [...new Set((data || []).map((p: any) => p.employee_id).filter(Boolean))];
      let empMap = new Map<string, any>();
      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, user_id, full_name, avatar_url, email')
          .in('id', empIds);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      const members: TaskMemberWithAccess[] = (data || [])
        .filter((p: any) => p.employee_id)
        .map((p: any) => {
          const emp = empMap.get(p.employee_id);
          return {
            employee_id: p.employee_id,
            user_id: emp?.user_id || '',
            full_name: emp?.full_name || 'Unknown',
            avatar_url: emp?.avatar_url || null,
            email: emp?.email || '',
            permission: p.permission_level || 'edit',
            added_at: p.created_at,
          };
        });

      setMembersWithAccess(members);
      // Also get the permission level from the first permission or default
      if (data && data.length > 0 && !data[0].employee_id) {
        setPermissionLevel((data[0].permission_level as TaskPermLevel) || 'edit');
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const applyGroupAccess = async (next: {
    scope: TaskAccessScope;
    permission: TaskPermLevel;
    officeIds?: string[];
    departments?: string[];
    projectIds?: string[];
  }) => {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      const table = TABLE_MAP[entityType];
      await supabase.from(table).update({ access_scope: next.scope }).eq('id', entityId);

      // Clear existing junction data
      await Promise.all([
        supabase.from('task_entity_offices').delete().eq('entity_type', entityType).eq('entity_id', entityId),
        supabase.from('task_entity_departments').delete().eq('entity_type', entityType).eq('entity_id', entityId),
        supabase.from('task_entity_projects').delete().eq('entity_type', entityType).eq('entity_id', entityId),
      ]);

      // Insert new junction data
      if (next.scope === 'offices' && (next.officeIds?.length || 0) > 0) {
        await supabase.from('task_entity_offices').insert(
          (next.officeIds || []).map(officeId => ({
            entity_type: entityType, entity_id: entityId, office_id: officeId, organization_id: organizationId,
          }))
        );
      }
      if (next.scope === 'departments' && (next.departments?.length || 0) > 0) {
        await supabase.from('task_entity_departments').insert(
          (next.departments || []).map(dept => ({
            entity_type: entityType, entity_id: entityId, department: dept, organization_id: organizationId,
          }))
        );
      }
      if (next.scope === 'projects' && (next.projectIds?.length || 0) > 0) {
        await supabase.from('task_entity_projects').insert(
          (next.projectIds || []).map(projectId => ({
            entity_type: entityType, entity_id: entityId, project_id: projectId, organization_id: organizationId,
          }))
        );
      }

      setAccessScope(next.scope);
      setPermissionLevel(next.permission);
      setSelectedOffices(next.officeIds || []);
      setSelectedDepartments(next.departments || []);
      setSelectedProjects(next.projectIds || []);
      toast.success('Access updated');
    } catch (error) {
      console.error('Error applying group access:', error);
      toast.error('Failed to update access');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSelections = async (selections: Selection[], permission: TaskPermLevel) => {
    const memberSelections = selections.filter(s => s.type === 'member');
    const groupSelections = selections.filter(s => s.type !== 'member');

    // Handle individual members
    if (memberSelections.length > 0) {
      setIsAdding(true);
      try {
        if (!organizationId || !currentEmployee?.id) throw new Error('Missing context');
        const insertData = memberSelections.map(s => ({
          entity_type: entityType,
          entity_id: entityId,
          employee_id: s.id,
          permission_level: permission,
          organization_id: organizationId,
        }));
        const { error } = await supabase.from('task_sharing_permissions').upsert(insertData, { onConflict: 'entity_type,entity_id,employee_id' });
        if (error) throw error;
        toast.success(`${memberSelections.length} ${memberSelections.length > 1 ? 'people' : 'person'} added`);
        loadMembersWithAccess();
      } catch (error) {
        console.error('Error adding members:', error);
        toast.error('Failed to add members');
      } finally {
        setIsAdding(false);
      }
    }

    // Handle group selections
    if (groupSelections.length === 0) return;

    const hasEveryone = groupSelections.some(s => s.type === 'everyone');
    if (hasEveryone) {
      await applyGroupAccess({ scope: 'company', permission, officeIds: [], departments: [], projectIds: [] });
      return;
    }

    const officeIds = [...new Set([...selectedOffices, ...groupSelections.filter(s => s.type === 'office').map(s => s.id)])];
    const depts = [...new Set([...selectedDepartments, ...groupSelections.filter(s => s.type === 'department').map(s => s.id)])];
    const projIds = [...new Set([...selectedProjects, ...groupSelections.filter(s => s.type === 'project').map(s => s.id)])];

    let scope: TaskAccessScope = accessScope;
    if (officeIds.length > 0 && depts.length === 0 && projIds.length === 0) scope = 'offices';
    else if (depts.length > 0 && officeIds.length === 0 && projIds.length === 0) scope = 'departments';
    else if (projIds.length > 0 && officeIds.length === 0 && depts.length === 0) scope = 'projects';
    else if (officeIds.length > 0) scope = 'offices';
    else if (depts.length > 0) scope = 'departments';
    else if (projIds.length > 0) scope = 'projects';

    await applyGroupAccess({ scope, permission, officeIds: officeIds, departments: depts, projectIds: projIds });
  };

  const handleUpdateMemberPermission = async (employeeId: string, permission: TaskPermLevel) => {
    setUpdatingMemberId(employeeId);
    try {
      const { error } = await supabase
        .from('task_sharing_permissions')
        .update({ permission_level: permission })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('employee_id', employeeId);
      if (error) throw error;
      setMembersWithAccess(prev => prev.map(m => m.employee_id === employeeId ? { ...m, permission } : m));
      toast.success('Permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    setUpdatingMemberId(employeeId);
    try {
      const { error } = await supabase
        .from('task_sharing_permissions')
        .delete()
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('employee_id', employeeId);
      if (error) throw error;
      setMembersWithAccess(prev => prev.filter(m => m.employee_id !== employeeId));
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveOffice = (officeId: string) => {
    const name = offices.find(o => o.id === officeId)?.name || 'this office';
    setConfirmDialog({
      open: true,
      title: 'Remove office access?',
      description: `Are you sure you want to remove access for "${name}"? Members of this office will lose access unless they have individual access.`,
      action: async () => {
        const updated = selectedOffices.filter(id => id !== officeId);
        await applyGroupAccess({ scope: updated.length > 0 ? 'offices' : 'members', permission: permissionLevel, officeIds: updated, departments: selectedDepartments, projectIds: selectedProjects });
      },
    });
  };

  const handleRemoveDepartment = (department: string) => {
    setConfirmDialog({
      open: true,
      title: 'Remove department access?',
      description: `Are you sure you want to remove access for "${department}"? Members will lose access unless individually added.`,
      action: async () => {
        const updated = selectedDepartments.filter(d => d !== department);
        await applyGroupAccess({ scope: updated.length > 0 ? 'departments' : 'members', permission: permissionLevel, officeIds: selectedOffices, departments: updated, projectIds: selectedProjects });
      },
    });
  };

  const handleRemoveProject = (projectId: string) => {
    const name = projects.find(p => p.id === projectId)?.name || 'this project';
    setConfirmDialog({
      open: true,
      title: 'Remove project access?',
      description: `Are you sure you want to remove access for "${name}"? Project members will lose access unless individually added.`,
      action: async () => {
        const updated = selectedProjects.filter(id => id !== projectId);
        await applyGroupAccess({ scope: updated.length > 0 ? 'projects' : 'members', permission: permissionLevel, officeIds: selectedOffices, departments: selectedDepartments, projectIds: updated });
      },
    });
  };

  const handleClearCompanyAccess = () => {
    setConfirmDialog({
      open: true,
      title: 'Remove company-wide access?',
      description: 'All members will lose access unless they have been added individually.',
      action: async () => {
        await applyGroupAccess({ scope: 'members', permission: permissionLevel, officeIds: [], departments: [], projectIds: [] });
      },
    });
  };

  const handleChangeGroupPermission = async (permission: TaskPermLevel) => {
    await applyGroupAccess({ scope: accessScope, permission, officeIds: selectedOffices, departments: selectedDepartments, projectIds: selectedProjects });
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    setIsTransferring(true);
    try {
      const table = TABLE_MAP[entityType];
      const { error } = await supabase.from(table).update({ created_by: newOwnerId }).eq('id', entityId);
      if (error) throw error;
      toast.success('Ownership transferred');
      setTransferDialogOpen(false);
      loadOwner();
    } catch (error) {
      toast.error('Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const excludedEmployeeIds = membersWithAccess.map(m => m.employee_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col max-h-[85vh] max-h-[85dvh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted shrink-0">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg truncate">Share "{entityName}"</DialogTitle>
              <DialogDescription>
                {entityStats || `Collaborate with members on this ${ENTITY_LABELS[entityType]}.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="space-y-6 p-6">
              {/* Add People */}
              <TaskInviteMember
                employees={employees}
                offices={offices}
                departments={departments}
                projects={projects}
                employeeProjects={employeeProjects}
                excludedEmployeeIds={excludedEmployeeIds}
                onAdd={handleAddSelections}
                isAdding={isAdding}
              />

              {/* Who has access */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Who has access</Label>
                <TaskMembersWithAccess
                  members={membersWithAccess}
                  isLoading={isMembersLoading}
                  owner={owner}
                  canTransferOwnership={currentEmployee?.id === owner?.employee_id || isOwner || isAdmin}
                  onTransferOwnership={() => setTransferDialogOpen(true)}
                  onUpdatePermission={handleUpdateMemberPermission}
                  onRemoveMember={handleRemoveMember}
                  isUpdating={updatingMemberId}
                  accessScope={accessScope}
                  permissionLevel={permissionLevel}
                  offices={offices}
                  departments={departments}
                  projects={projects}
                  selectedOffices={selectedOffices}
                  selectedDepartments={selectedDepartments}
                  selectedProjects={selectedProjects}
                  employees={employees}
                  onRemoveOffice={handleRemoveOffice}
                  onRemoveDepartment={handleRemoveDepartment}
                  onRemoveProject={handleRemoveProject}
                  onClearCompanyAccess={handleClearCompanyAccess}
                  onChangeGroupPermission={handleChangeGroupPermission}
                  isChangingPermission={isSaving}
                />
              </div>

              {/* Copy Link */}
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleCopyLink}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </ScrollArea>
        )}

        {/* Transfer Ownership Dialog */}
        <TaskTransferOwnershipDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          entityType={entityType}
          entityName={entityName}
          currentOwnerId={owner?.employee_id || ''}
          employees={employees}
          onTransfer={handleTransferOwnership}
          isTransferring={isTransferring}
        />

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => { await confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}>
                Remove Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
