 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { X, Plus, UserMinus, Loader2 } from "lucide-react";
 import { useOrganization } from "@/hooks/useOrganization";
 import { useCurrentEmployee } from "@/services/useCurrentEmployee";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import type { OfficeAttendanceExemption } from "@/hooks/useOfficeAttendanceSettings";
 
 interface ExemptionsTabProps {
   officeId: string;
   exemptions: OfficeAttendanceExemption[];
   isLoading: boolean;
   onAddExemption: (employeeId: string) => void;
   onRemoveExemption: (exemptionId: string) => void;
   isAdding: boolean;
   isRemoving: boolean;
 }
 
 export const ExemptionsTab = ({
   officeId,
   exemptions,
   isLoading,
   onAddExemption,
   onRemoveExemption,
   isAdding,
   isRemoving,
 }: ExemptionsTabProps) => {
   const [selectedEmployee, setSelectedEmployee] = useState<string>('');
   const { currentOrg } = useOrganization();
 
   // Fetch employees from this office who are not already exempted
   const { data: availableEmployees = [] } = useQuery({
     queryKey: ['office-employees-for-exemption', officeId, exemptions],
     queryFn: async () => {
       if (!currentOrg?.id || !officeId) return [];
 
       const exemptedIds = exemptions.map(e => e.employee_id);
 
       const { data, error } = await supabase
         .from('employees')
         .select(`
           id,
           position,
           profiles!inner(
             full_name,
             avatar_url
           )
         `)
         .eq('organization_id', currentOrg.id)
         .eq('office_id', officeId)
         .eq('status', 'active')
         .order('profiles(full_name)');
 
       if (error) throw error;
       
       return (data || []).filter(e => !exemptedIds.includes(e.id));
     },
     enabled: !!currentOrg?.id && !!officeId,
   });
 
   const handleAdd = () => {
     if (selectedEmployee) {
       onAddExemption(selectedEmployee);
       setSelectedEmployee('');
     }
   };
 
   const getInitials = (name: string) => {
     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   };
 
   return (
     <div className="space-y-6">
       <div className="space-y-2">
         <p className="text-sm text-muted-foreground">
           Employees exempt from check-in won&apos;t appear in &quot;Not Checked In&quot; reports 
           and won&apos;t receive attendance reminders.
         </p>
       </div>
 
       {/* Add exemption */}
       <div className="flex items-center gap-2">
         <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
           <SelectTrigger className="w-64">
             <SelectValue placeholder="Select employee to exempt" />
           </SelectTrigger>
           <SelectContent>
             {availableEmployees.map((emp: any) => (
               <SelectItem key={emp.id} value={emp.id}>
                 {emp.profiles?.full_name || 'Unknown'}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
         <Button 
           onClick={handleAdd} 
           disabled={!selectedEmployee || isAdding}
           size="sm"
           className="gap-1"
         >
           {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
           Add
         </Button>
       </div>
 
       {/* Exemptions list */}
       <div className="border rounded-lg divide-y">
         {isLoading ? (
           <div className="p-4 text-center text-muted-foreground">
             <Loader2 className="h-5 w-5 animate-spin mx-auto" />
           </div>
         ) : exemptions.length === 0 ? (
           <div className="p-6 text-center text-muted-foreground">
             <UserMinus className="h-8 w-8 mx-auto mb-2 opacity-50" />
             <p className="text-sm">No employees are currently exempt from check-in</p>
           </div>
         ) : (
           exemptions.map((exemption) => (
             <div key={exemption.id} className="flex items-center justify-between p-3">
               <div className="flex items-center gap-3">
                 <Avatar className="h-8 w-8">
                   <AvatarImage src={exemption.employee?.profiles?.avatar_url || undefined} />
                   <AvatarFallback className="text-xs">
                     {getInitials(exemption.employee?.profiles?.full_name || '?')}
                   </AvatarFallback>
                 </Avatar>
                 <div>
                   <p className="text-sm font-medium">
                     {exemption.employee?.profiles?.full_name || 'Unknown'}
                   </p>
                   <p className="text-xs text-muted-foreground">
                     {exemption.employee?.position || 'No position'}
                   </p>
                 </div>
               </div>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-8 w-8 text-muted-foreground hover:text-destructive"
                 onClick={() => onRemoveExemption(exemption.id)}
                 disabled={isRemoving}
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
           ))
         )}
       </div>
     </div>
   );
 };