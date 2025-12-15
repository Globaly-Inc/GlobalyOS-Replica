import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Copy,
  Check,
  Loader2,
  Link2,
  UserPlus,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { WikiMembersWithAccess, MemberWithAccess, OwnerInfo } from "./WikiMembersWithAccess";
import { WikiAddMember, type Selection } from "./WikiInviteMember";
import { Switch } from "@/components/ui/switch";
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
  const [publicLinkExpanded, setPublicLinkExpanded] = useState(false);
  const [publicLinkEnabled, setPublicLinkEnabled] = useState(false);
  const [publicLinkId, setPublicLinkId] = useState<string | null>(null);
  const [isTogglingPublicLink, setIsTogglingPublicLink] = useState(false);

  // Owner state
  const [owner, setOwner] = useState<OwnerInfo | null>(null);

  // Members with access
  const [membersWithAccess, setMembersWithAccess] = useState<MemberWithAccess[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
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
  const [employeeProjects, setEmployeeProjects] = useState<{ employee_id: string; project_id: string }[]>([]);

  // Load available options and current permissions
  useEffect(() => {
    if (open && organizationId) {
      loadOptions();
      loadCurrentPermissions();
      loadMembersWithAccess();
      loadOwner();
    }
  }, [open, organizationId, itemId, itemType]);

  const loadOwner = async () => {
    try {
      const table = itemType === 'folder' ? 'wiki_folders' : 'wiki_pages';
      const { data: itemData, error } = await supabase
        .from(table)
        .select('created_by')
        .eq('id', itemId)
        .single();

      if (error || !itemData) return;

      const createdBy = (itemData as { created_by: string }).created_by;
      
      // Fetch owner employee details
      const { data: empData } = await supabase
        .from('employees')
        .select('id, profiles(full_name, avatar_url, email)')
        .eq('id', createdBy)
        .single();

      if (empData) {
        const profiles = empData.profiles as { full_name: string; avatar_url: string | null; email: string } | null;
        setOwner({
          employee_id: empData.id,
          full_name: profiles?.full_name || 'Unknown',
          avatar_url: profiles?.avatar_url || null,
          email: profiles?.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading owner:', error);
    }
  };

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

      // Load employee_projects junction for project member resolution
      const { data: empProjectsData } = await supabase
        .from('employee_projects')
        .select('employee_id, project_id')
        .eq('organization_id', organizationId);
      setEmployeeProjects(empProjectsData || []);
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

  const handleAddMembers = async (employeeIds: string[], permission: 'view' | 'edit') => {
    if (!currentEmployee?.id) return;

    setIsAdding(true);
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

      // Get user_ids for notifications
      const { data: empData } = await supabase
        .from('employees')
        .select('id, user_id')
        .in('id', employeeIds);

      // Create notifications for added members
      if (empData && empData.length > 0) {
        const notificationData = empData.map(emp => ({
          user_id: emp.user_id,
          organization_id: organizationId,
          type: 'wiki_access',
          title: `Wiki ${itemType} shared with you`,
          message: `You have been given ${permission} access to "${itemName}"`,
          reference_type: `wiki_${itemType}`,
          reference_id: itemId,
          actor_id: currentEmployee.id,
        }));

        await supabase.from('notifications').insert(notificationData);
      }

      toast.success(`${employeeIds.length} ${employeeIds.length > 1 ? 'people' : 'person'} added`);
      loadMembersWithAccess();
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error('Failed to add members');
    } finally {
      setIsAdding(false);
    }
  };

  const applyGroupAccess = async (next: {
    scope: WikiAccessScope;
    permission: WikiPermissionLevel;
    officeIds?: string[];
    departments?: string[];
    projectIds?: string[];
  }) => {
    setIsSaving(true);
    try {
      if (itemType === 'folder') {
        await supabase
          .from('wiki_folders')
          .update({
            access_scope: next.scope,
            permission_level: next.permission,
          })
          .eq('id', itemId);

        await Promise.all([
          supabase.from('wiki_folder_offices').delete().eq('folder_id', itemId),
          supabase.from('wiki_folder_departments').delete().eq('folder_id', itemId),
          supabase.from('wiki_folder_projects').delete().eq('folder_id', itemId),
        ]);

        if (next.scope === 'offices' && (next.officeIds?.length || 0) > 0) {
          await supabase.from('wiki_folder_offices').insert(
            (next.officeIds || []).map(officeId => ({
              folder_id: itemId,
              office_id: officeId,
              organization_id: organizationId,
            })),
          );
        }

        if (next.scope === 'departments' && (next.departments?.length || 0) > 0) {
          await supabase.from('wiki_folder_departments').insert(
            (next.departments || []).map(dept => ({
              folder_id: itemId,
              department: dept,
              organization_id: organizationId,
            })),
          );
        }

        if (next.scope === 'projects' && (next.projectIds?.length || 0) > 0) {
          await supabase.from('wiki_folder_projects').insert(
            (next.projectIds || []).map(projectId => ({
              folder_id: itemId,
              project_id: projectId,
              organization_id: organizationId,
            })),
          );
        }
      } else {
        await supabase
          .from('wiki_pages')
          .update({
            access_scope: next.scope,
            permission_level: next.permission,
            inherit_from_folder: inheritFromFolder,
          })
          .eq('id', itemId);

        await Promise.all([
          supabase.from('wiki_page_offices').delete().eq('page_id', itemId),
          supabase.from('wiki_page_departments').delete().eq('page_id', itemId),
          supabase.from('wiki_page_projects').delete().eq('page_id', itemId),
        ]);

        if (next.scope === 'offices' && (next.officeIds?.length || 0) > 0) {
          await supabase.from('wiki_page_offices').insert(
            (next.officeIds || []).map(officeId => ({
              page_id: itemId,
              office_id: officeId,
              organization_id: organizationId,
            })),
          );
        }

        if (next.scope === 'departments' && (next.departments?.length || 0) > 0) {
          await supabase.from('wiki_page_departments').insert(
            (next.departments || []).map(dept => ({
              page_id: itemId,
              department: dept,
              organization_id: organizationId,
            })),
          );
        }

        if (next.scope === 'projects' && (next.projectIds?.length || 0) > 0) {
          await supabase.from('wiki_page_projects').insert(
            (next.projectIds || []).map(projectId => ({
              page_id: itemId,
              project_id: projectId,
              organization_id: organizationId,
            })),
          );
        }
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

  const handleAddSelections = async (selections: Selection[], permission: 'view' | 'edit') => {
    const memberSelections = selections.filter(s => s.type === 'member');
    const groupSelections = selections.filter(s => s.type !== 'member');

    // Handle member additions separately
    if (memberSelections.length > 0) {
      const employeeIds = memberSelections.map(s => s.id);
      await handleAddMembers(employeeIds, permission);
    }

    // If no group selections, we're done
    if (groupSelections.length === 0) {
      return;
    }

    // Check for "everyone" selection
    const hasEveryone = groupSelections.some(s => s.type === 'everyone');
    if (hasEveryone) {
      await applyGroupAccess({
        scope: 'company',
        permission,
        officeIds: [],
        departments: [],
        projectIds: [],
      });
      return;
    }

    // Merge all group types together
    const officeSelections = groupSelections.filter(s => s.type === 'office').map(s => s.id);
    const departmentSelections = groupSelections.filter(s => s.type === 'department').map(s => s.id);
    const projectSelections = groupSelections.filter(s => s.type === 'project').map(s => s.id);

    const mergedOffices = [...new Set([...selectedOffices, ...officeSelections])];
    const mergedDepartments = [...new Set([...selectedDepartments, ...departmentSelections])];
    const mergedProjects = [...new Set([...selectedProjects, ...projectSelections])];

    // Determine the scope based on what was added - prioritize the most specific
    let scope: WikiAccessScope = accessScope;
    if (mergedOffices.length > 0 && mergedDepartments.length === 0 && mergedProjects.length === 0) {
      scope = 'offices';
    } else if (mergedDepartments.length > 0 && mergedOffices.length === 0 && mergedProjects.length === 0) {
      scope = 'departments';
    } else if (mergedProjects.length > 0 && mergedOffices.length === 0 && mergedDepartments.length === 0) {
      scope = 'projects';
    } else if (mergedOffices.length > 0 || mergedDepartments.length > 0 || mergedProjects.length > 0) {
      // Mixed groups - use a combined scope, defaulting to the first added type
      if (officeSelections.length > 0) scope = 'offices';
      else if (departmentSelections.length > 0) scope = 'departments';
      else if (projectSelections.length > 0) scope = 'projects';
    }

    await applyGroupAccess({
      scope,
      permission,
      officeIds: mergedOffices,
      departments: mergedDepartments,
      projectIds: mergedProjects,
    });
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

  const handleRemoveOffice = async (officeId: string) => {
    const updatedOffices = selectedOffices.filter(id => id !== officeId);
    await applyGroupAccess({
      scope: updatedOffices.length > 0 ? 'offices' : 'members',
      permission: permissionLevel,
      officeIds: updatedOffices,
      departments: selectedDepartments,
      projectIds: selectedProjects,
    });
  };

  const handleRemoveDepartment = async (department: string) => {
    const updatedDepts = selectedDepartments.filter(d => d !== department);
    await applyGroupAccess({
      scope: updatedDepts.length > 0 ? 'departments' : 'members',
      permission: permissionLevel,
      officeIds: selectedOffices,
      departments: updatedDepts,
      projectIds: selectedProjects,
    });
  };

  const handleRemoveProject = async (projectId: string) => {
    const updatedProjects = selectedProjects.filter(id => id !== projectId);
    await applyGroupAccess({
      scope: updatedProjects.length > 0 ? 'projects' : 'members',
      permission: permissionLevel,
      officeIds: selectedOffices,
      departments: selectedDepartments,
      projectIds: updatedProjects,
    });
  };

  const handleClearCompanyAccess = async () => {
    await applyGroupAccess({
      scope: 'members',
      permission: permissionLevel,
      officeIds: [],
      departments: [],
      projectIds: [],
    });
  };

  const handleChangeGroupPermission = async (permission: 'view' | 'edit') => {
    await applyGroupAccess({
      scope: accessScope,
      permission,
      officeIds: selectedOffices,
      departments: selectedDepartments,
      projectIds: selectedProjects,
    });
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
    const url = publicLinkEnabled && publicLinkId 
      ? `${window.location.origin}/public/wiki/${publicLinkId}`
      : `${window.location.origin}/org/${currentOrg?.slug}/wiki/${itemType}/${itemId}`;
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted shrink-0">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">Share "{itemName}"</SheetTitle>
              <SheetDescription>
                Collaborate with members on this {itemType}.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="space-y-6 p-6">
              {/* Add People Section */}
              <WikiAddMember
                employees={employees}
                offices={offices}
                departments={departments}
                projects={projects}
                employeeProjects={employeeProjects}
                excludedEmployeeIds={excludedEmployeeIds}
                onAdd={handleAddSelections}
                isAdding={isAdding}
              />

              {/* Who has access Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Who has access</Label>
                <WikiMembersWithAccess
                  members={membersWithAccess}
                  isLoading={isMembersLoading}
                  owner={owner}
                  canTransferOwnership={currentEmployee?.id === owner?.employee_id}
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

            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
