 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Clock, AlertCircle } from "lucide-react";
 
 interface AutoCheckoutTabProps {
   autoCheckoutEnabled: boolean;
   autoCheckoutAfterMinutes: number;
   autoCheckoutStatus: string;
   onSettingChange: (field: string, value: boolean | number | string) => void;
 }
 
 export const AutoCheckoutTab = ({
   autoCheckoutEnabled,
   autoCheckoutAfterMinutes,
   autoCheckoutStatus,
   onSettingChange,
 }: AutoCheckoutTabProps) => {
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
         <div className="space-y-0.5">
           <Label className="text-sm font-medium">Enable Auto Checkout</Label>
           <p className="text-xs text-muted-foreground">
             Automatically check out employees who haven&apos;t checked out after their scheduled end time
           </p>
         </div>
         <Switch
           checked={autoCheckoutEnabled}
           onCheckedChange={(checked) => onSettingChange('auto_checkout_enabled', checked)}
         />
       </div>
 
       {autoCheckoutEnabled && (
         <div className="space-y-4 p-4 rounded-lg border">
           <div className="flex items-center gap-2">
             <Clock className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium text-sm">Auto Checkout Settings</span>
           </div>
 
           <div className="space-y-4 pl-6">
             <div className="space-y-2">
               <Label className="text-sm">Auto checkout after (minutes past schedule)</Label>
               <Input
                 type="number"
                 min="15"
                 max="480"
                 value={autoCheckoutAfterMinutes}
                 onChange={(e) => onSettingChange('auto_checkout_after_minutes', parseInt(e.target.value) || 60)}
                 className="w-32"
               />
               <p className="text-xs text-muted-foreground">
                 Minutes after scheduled end time before auto checkout triggers
               </p>
             </div>
 
             <div className="space-y-2">
               <Label className="text-sm">Set attendance status to</Label>
               <Select
                 value={autoCheckoutStatus}
                 onValueChange={(v) => onSettingChange('auto_checkout_status', v)}
               >
                 <SelectTrigger className="w-48">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="present">Present</SelectItem>
                   <SelectItem value="late">Late</SelectItem>
                   <SelectItem value="half_day">Half Day</SelectItem>
                 </SelectContent>
               </Select>
               <p className="text-xs text-muted-foreground">
                 Attendance status to assign for auto-checkout records
               </p>
             </div>
           </div>
 
           <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
             <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
             <p className="text-sm text-blue-700 dark:text-blue-300">
               Auto checkout runs periodically throughout the day. Employees who haven&apos;t checked out 
               will be automatically checked out based on this office&apos;s timezone settings.
             </p>
           </div>
         </div>
       )}
     </div>
   );
 };