 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Clock, TrendingUp, TrendingDown, Info } from "lucide-react";
 
 interface OfficeLeaveType {
   id: string;
   name: string;
 }
 
 interface OvertimeTabProps {
   autoAdjustmentsEnabled: boolean;
   overtimeCreditLeaveTypeId: string | null;
   undertimeDebitLeaveTypeId: string | null;
   undertimeFallbackLeaveTypeId: string | null;
   maxDilDays: number | null;
   minOvertimeMinutes: number;
   minUndertimeMinutes: number;
   leaveTypes: OfficeLeaveType[];
   onSettingChange: (field: string, value: boolean | number | string | null) => void;
 }
 
 export const OvertimeTab = ({
   autoAdjustmentsEnabled,
   overtimeCreditLeaveTypeId,
   undertimeDebitLeaveTypeId,
   undertimeFallbackLeaveTypeId,
   maxDilDays,
   minOvertimeMinutes,
   minUndertimeMinutes,
   leaveTypes,
   onSettingChange,
 }: OvertimeTabProps) => {
   const hasDilCap = maxDilDays !== null;
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
         <div className="space-y-0.5">
           <Label className="text-sm font-medium">Enable Automatic Adjustments</Label>
           <p className="text-xs text-muted-foreground">
             Automatically convert overtime to leave credits and deduct for undertime
           </p>
         </div>
         <Switch
           checked={autoAdjustmentsEnabled}
           onCheckedChange={(checked) => onSettingChange('auto_adjustments_enabled', checked)}
         />
       </div>
 
       {autoAdjustmentsEnabled && (
         <>
           {/* Overtime Credit Section */}
           <div className="space-y-4 p-4 rounded-lg border">
             <div className="flex items-center gap-2">
               <TrendingUp className="h-4 w-4 text-green-500" />
               <span className="font-medium text-sm">Overtime Credit</span>
             </div>
 
             <div className="space-y-4 pl-6">
               <div className="space-y-2">
                 <Label className="text-sm">Credit leave type</Label>
                 <Select
                   value={overtimeCreditLeaveTypeId || ''}
                   onValueChange={(v) => onSettingChange('overtime_credit_leave_type_id', v || null)}
                 >
                   <SelectTrigger className="w-64">
                     <SelectValue placeholder="Select leave type" />
                   </SelectTrigger>
                   <SelectContent>
                     {leaveTypes.map(lt => (
                       <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <p className="text-xs text-muted-foreground">
                   Leave type to credit when overtime accumulates to a full day
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label className="text-sm">Minimum overtime (minutes)</Label>
                 <Input
                   type="number"
                   min="0"
                   max="120"
                   value={minOvertimeMinutes}
                   onChange={(e) => onSettingChange('min_overtime_minutes', parseInt(e.target.value) || 0)}
                   className="w-32"
                 />
                 <p className="text-xs text-muted-foreground">
                   Daily overtime below this threshold is ignored
                 </p>
               </div>
 
               <div className="space-y-2">
                 <div className="flex items-center gap-2">
                   <Checkbox
                     id="hasDilCap"
                     checked={hasDilCap}
                     onCheckedChange={(checked) => {
                       if (!checked) {
                         onSettingChange('max_dil_days', null);
                       } else {
                         onSettingChange('max_dil_days', 10);
                       }
                     }}
                   />
                   <Label htmlFor="hasDilCap" className="text-sm cursor-pointer">
                     Cap maximum balance
                   </Label>
                 </div>
                 {hasDilCap && (
                   <div className="flex items-center gap-2 pl-6">
                     <span className="text-sm text-muted-foreground">Maximum:</span>
                     <Input
                       type="number"
                       min="0"
                       step="0.5"
                       value={maxDilDays ?? ''}
                       onChange={(e) => onSettingChange('max_dil_days', parseFloat(e.target.value) || null)}
                       className="w-20"
                     />
                     <span className="text-sm text-muted-foreground">days</span>
                   </div>
                 )}
               </div>
             </div>
           </div>
 
           {/* Undertime Deduction Section */}
           <div className="space-y-4 p-4 rounded-lg border">
             <div className="flex items-center gap-2">
               <TrendingDown className="h-4 w-4 text-red-500" />
               <span className="font-medium text-sm">Undertime Deduction</span>
             </div>
 
             <div className="space-y-4 pl-6">
               <div className="space-y-2">
                 <Label className="text-sm">Primary deduction type</Label>
                 <Select
                   value={undertimeDebitLeaveTypeId || ''}
                   onValueChange={(v) => onSettingChange('undertime_debit_leave_type_id', v || null)}
                 >
                   <SelectTrigger className="w-64">
                     <SelectValue placeholder="Select leave type" />
                   </SelectTrigger>
                   <SelectContent>
                     {leaveTypes.map(lt => (
                       <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <p className="text-xs text-muted-foreground">
                   First leave type to deduct from when undertime accumulates
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label className="text-sm">Fallback deduction type</Label>
                 <Select
                   value={undertimeFallbackLeaveTypeId || ''}
                   onValueChange={(v) => onSettingChange('undertime_fallback_leave_type_id', v || null)}
                 >
                   <SelectTrigger className="w-64">
                     <SelectValue placeholder="Select fallback leave type" />
                   </SelectTrigger>
                   <SelectContent>
                     {leaveTypes.map(lt => (
                       <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <p className="text-xs text-muted-foreground">
                   Used if primary type has insufficient balance
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label className="text-sm">Grace period (minutes)</Label>
                 <Input
                   type="number"
                   min="0"
                   max="60"
                   value={minUndertimeMinutes}
                   onChange={(e) => onSettingChange('min_undertime_minutes', parseInt(e.target.value) || 0)}
                   className="w-32"
                 />
                 <p className="text-xs text-muted-foreground">
                   Daily undertime below this threshold is ignored
                 </p>
               </div>
             </div>
           </div>
 
           {/* How it works */}
           <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
             <div className="flex items-center gap-2">
               <Info className="h-4 w-4 text-blue-500" />
               <span className="font-medium text-sm">How it works</span>
             </div>
             <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside pl-4">
               <li><strong>Early check-in / late check-out:</strong> Extra hours accumulate based on each employee&apos;s work schedule. When they reach a full workday, leave is credited.</li>
               <li><strong>Late check-in / early check-out:</strong> Deficit hours accumulate. When they reach a full workday, leave is deducted (primary first, then fallback).</li>
               <li>Adjustments are processed automatically at end of each day.</li>
             </ul>
           </div>
         </>
       )}
     </div>
   );
 };