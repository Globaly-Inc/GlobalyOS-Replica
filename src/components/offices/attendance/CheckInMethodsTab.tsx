import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Briefcase, Home } from "lucide-react";

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

type MethodDef = { id: string; label: string };

const OFFICE_METHODS: MethodDef[] = [
  { id: 'qr', label: 'QR Code Scan' },
  { id: 'location', label: 'Office Location Verification' },
];

const HYBRID_METHODS: MethodDef[] = [
  { id: 'qr', label: 'QR Code Scan' },
  { id: 'location', label: 'Office Location Verification' },
  { id: 'remote', label: 'Remote Check-in' },
  { id: 'remote_location', label: 'Remote Location Verification' },
];

const REMOTE_METHODS: MethodDef[] = [
  { id: 'remote', label: 'Remote Check-in' },
  { id: 'remote_location', label: 'Remote Location Verification' },
];

const LOCATION_METHOD_IDS = ['location'];

const METHOD_DESCRIPTIONS: Record<string, string> = {
  location: 'Verifies team member is within office geofence radius',
  remote_location: 'Captures team member\'s current location during check-in/out',
  qr: 'Scan office QR code to check in',
  remote: 'Check in remotely without location tracking',
};

export const CheckInMethodsTab = ({
  officeCheckinMethods,
  hybridCheckinMethods,
  remoteCheckinMethods,
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
    availableMethods: MethodDef[],
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
        {availableMethods.map(method => {
          const isChecked = methods.includes(method.id);
          const isLocationMethod = LOCATION_METHOD_IDS.includes(method.id);
          return (
            <div key={method.id}>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id={`${workType}-${method.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleMethod(workType, method.id)}
                  className="mt-0.5"
                />
                <div>
                  <label
                    htmlFor={`${workType}-${method.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {method.label}
                  </label>
                  {METHOD_DESCRIPTIONS[method.id] && (
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {METHOD_DESCRIPTIONS[method.id]}
                    </p>
                  )}
                </div>
              </div>
              {isLocationMethod && isChecked && (
                <div className="ml-7 mt-1.5 flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Geofence:</Label>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    value={locationRadiusMeters}
                    onChange={(e) => onLocationSettingsChange('location_radius_meters', parseInt(e.target.value) || 100)}
                    className="w-20 h-7 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">meters</span>
                </div>
              )}
            </div>
          );
        })}
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
          OFFICE_METHODS,
          'bg-blue-100 dark:bg-blue-900/30'
        )}

        {renderMethodSection(
          'Hybrid Workers',
          <Briefcase className="h-4 w-4 text-purple-600" />,
          'hybrid',
          hybridCheckinMethods,
          HYBRID_METHODS,
          'bg-purple-100 dark:bg-purple-900/30'
        )}

        {renderMethodSection(
          'Remote Workers',
          <Home className="h-4 w-4 text-green-600" />,
          'remote',
          remoteCheckinMethods,
          REMOTE_METHODS,
          'bg-green-100 dark:bg-green-900/30'
        )}
      </div>
    </div>
  );
};
