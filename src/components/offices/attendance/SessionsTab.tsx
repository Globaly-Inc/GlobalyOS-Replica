 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Users, LogOut } from "lucide-react";
 
 interface SessionsTabProps {
   multiSessionEnabled: boolean;
   maxSessionsPerDay: number;
   earlyCheckoutReasonRequired: boolean;
   onSettingChange: (field: string, value: boolean | number) => void;
 }
 
 export const SessionsTab = ({
   multiSessionEnabled,
   maxSessionsPerDay,
   earlyCheckoutReasonRequired,
   onSettingChange,
 }: SessionsTabProps) => {
   return (
     <div className="space-y-6">
       {/* Multi-session settings */}
       <div className="space-y-4">
         <div className="flex items-center gap-2">
           <Users className="h-4 w-4 text-muted-foreground" />
           <span className="font-medium text-sm">Session Settings</span>
         </div>
 
         <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
           <div className="space-y-0.5">
             <Label className="text-sm font-medium">Allow Multiple Sessions Per Day</Label>
             <p className="text-xs text-muted-foreground">
               When enabled, employees can check-in multiple times per day
             </p>
           </div>
           <Switch
             checked={multiSessionEnabled}
             onCheckedChange={(checked) => onSettingChange('multi_session_enabled', checked)}
           />
         </div>
 
         {multiSessionEnabled && (
           <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
             <Label className="text-sm">Maximum Sessions Per Day</Label>
             <Select 
               value={String(maxSessionsPerDay)} 
               onValueChange={(v) => onSettingChange('max_sessions_per_day', parseInt(v))}
             >
               <SelectTrigger className="w-32">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="1">1</SelectItem>
                 <SelectItem value="2">2</SelectItem>
                 <SelectItem value="3">3</SelectItem>
                 <SelectItem value="4">4</SelectItem>
                 <SelectItem value="5">5</SelectItem>
               </SelectContent>
             </Select>
             <p className="text-xs text-muted-foreground">
               Number of times an employee can check-in/out per day
             </p>
           </div>
         )}
 
         {!multiSessionEnabled && (
           <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-3">
             <p className="text-sm text-amber-700 dark:text-amber-300">
               When disabled, employees cannot check-in again after checking out for the day.
               Owner, Admin, and HR can still add/edit attendance records manually.
             </p>
           </div>
         )}
       </div>
 
       {/* Early checkout settings */}
       <div className="border-t pt-6 space-y-4">
         <div className="flex items-center gap-2">
           <LogOut className="h-4 w-4 text-muted-foreground" />
           <span className="font-medium text-sm">Early Checkout</span>
         </div>
 
         <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
           <div className="space-y-0.5">
             <Label className="text-sm font-medium">Require Reason for Early Checkout</Label>
             <p className="text-xs text-muted-foreground">
               Employees must provide a reason when checking out before their scheduled end time
             </p>
           </div>
           <Switch
             checked={earlyCheckoutReasonRequired}
             onCheckedChange={(checked) => onSettingChange('early_checkout_reason_required', checked)}
           />
         </div>
       </div>
     </div>
   );
 };