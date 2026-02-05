  import { Label } from "@/components/ui/label";
  import { Checkbox } from "@/components/ui/checkbox";
  import { Input } from "@/components/ui/input";
  import { Switch } from "@/components/ui/switch";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Building2, Briefcase, Home, MapPin } from "lucide-react";
 
 interface CheckInMethodsTabProps {
   officeCheckinMethods: string[];
   hybridCheckinMethods: string[];
   remoteCheckinMethods: string[];
   requireLocationForOffice: boolean;
   requireLocationForHybrid: boolean;
   locationRadiusMeters: number;
   onMethodChange: (workType: 'office' | 'hybrid' | 'remote', methods: string[]) => void;
   onLocationSettingsChange: (field: string, value: boolean | number) => void;
 }
 
 const AVAILABLE_METHODS = [
   { id: 'qr', label: 'QR Code Scan', description: 'Scan office QR code to check in' },
   { id: 'location', label: 'Location Verification', description: 'Verify GPS location' },
   { id: 'remote', label: 'Remote Check-in', description: 'Check in from anywhere' },
   { id: 'third_party', label: 'Third-party System', description: 'Coming Soon', disabled: true },
 ];
 
 export const CheckInMethodsTab = ({
   officeCheckinMethods,
   hybridCheckinMethods,
   remoteCheckinMethods,
   requireLocationForOffice,
   requireLocationForHybrid,
   locationRadiusMeters,
   onMethodChange,
   onLocationSettingsChange,
 }: CheckInMethodsTabProps) => {
   const toggleMethod = (workType: 'office' | 'hybrid' | 'remote', methodId: string) => {
     const currentMethods = workType === 'office' 
       ? officeCheckinMethods 
       : workType === 'hybrid' 
         ? hybridCheckinMethods 
         : remoteCheckinMethods;
     
     const newMethods = currentMethods.includes(methodId)
       ? currentMethods.filter(m => m !== methodId)
       : [...currentMethods, methodId];
     
     onMethodChange(workType, newMethods);
   };
 
   const renderMethodSection = (
     title: string, 
     icon: React.ReactNode, 
     workType: 'office' | 'hybrid' | 'remote',
     methods: string[],
    availableMethods: typeof AVAILABLE_METHODS,
    accentColor: string
   ) => (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <div className={`p-1.5 rounded-md ${accentColor}`}>
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
         {availableMethods.map(method => (
          <div key={method.id} className="flex items-start gap-2.5">
             <Checkbox
               id={`${workType}-${method.id}`}
               checked={methods.includes(method.id)}
               onCheckedChange={() => !method.disabled && toggleMethod(workType, method.id)}
               disabled={method.disabled}
              className="mt-0.5"
             />
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`${workType}-${method.id}`}
                className={`text-sm cursor-pointer block ${method.disabled ? 'text-muted-foreground' : ''}`}
              >
                {method.label}
              </label>
              {method.disabled && (
                <span className="text-xs text-muted-foreground">{method.description}</span>
              )}
            </div>
           </div>
         ))}
      </CardContent>
    </Card>
   );
 
   return (
     <div className="space-y-6">
       <p className="text-sm text-muted-foreground">
         Configure how employees check in based on their work type
       </p>
 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {renderMethodSection(
           'Office Workers',
          <Building2 className="h-4 w-4 text-blue-600" />,
           'office',
           officeCheckinMethods,
          AVAILABLE_METHODS.filter(m => m.id !== 'remote'),
          'bg-blue-100 dark:bg-blue-900/30'
         )}
 
         {renderMethodSection(
           'Hybrid Workers',
          <Briefcase className="h-4 w-4 text-purple-600" />,
           'hybrid',
           hybridCheckinMethods,
          AVAILABLE_METHODS,
          'bg-purple-100 dark:bg-purple-900/30'
         )}
 
         {renderMethodSection(
           'Remote Workers',
          <Home className="h-4 w-4 text-green-600" />,
           'remote',
           remoteCheckinMethods,
          AVAILABLE_METHODS.filter(m => m.id === 'remote' || m.id === 'third_party'),
          'bg-green-100 dark:bg-green-900/30'
         )}
       </div>
 
       <div className="border-t pt-6 space-y-4">
         <div className="flex items-center gap-2">
           <MapPin className="h-4 w-4 text-muted-foreground" />
           <span className="font-medium text-sm">Location Settings</span>
         </div>
 
         <div className="space-y-4 pl-6">
           <div className="flex items-center justify-between">
             <div className="space-y-0.5">
               <Label className="text-sm">Require location for office check-in</Label>
               <p className="text-xs text-muted-foreground">
                 Office workers must verify their GPS location
               </p>
             </div>
             <Switch
               checked={requireLocationForOffice}
               onCheckedChange={(checked) => onLocationSettingsChange('require_location_for_office', checked)}
             />
           </div>
 
           <div className="flex items-center justify-between">
             <div className="space-y-0.5">
               <Label className="text-sm">Require location for hybrid check-in</Label>
               <p className="text-xs text-muted-foreground">
                 Hybrid workers must verify location when in office
               </p>
             </div>
             <Switch
               checked={requireLocationForHybrid}
               onCheckedChange={(checked) => onLocationSettingsChange('require_location_for_hybrid', checked)}
             />
           </div>
 
           <div className="space-y-2">
             <Label className="text-sm">Geofence radius (meters)</Label>
             <Input
               type="number"
               min="10"
               max="1000"
               value={locationRadiusMeters}
               onChange={(e) => onLocationSettingsChange('location_radius_meters', parseInt(e.target.value) || 100)}
               className="w-32"
             />
             <p className="text-xs text-muted-foreground">
               Maximum distance from office for valid check-in
             </p>
           </div>
         </div>
       </div>
     </div>
   );
 };