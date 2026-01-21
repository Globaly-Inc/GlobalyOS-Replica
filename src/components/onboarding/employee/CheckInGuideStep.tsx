/**
 * Owner Onboarding - QR Code Download Guide Step
 * Explains QR-based attendance with 100m geofencing for owners
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, QrCode, MapPin, Building2, Download, RefreshCw, Loader2 } from 'lucide-react';

interface CheckInGuideStepProps {
  onContinue: () => void;
  onBack?: () => void;
  isNavigating?: boolean;
}

export function CheckInGuideStep({ onContinue, onBack, isNavigating = false }: CheckInGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <QrCode className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">QR Codes for Team Check-In</CardTitle>
        <CardDescription className="text-base">
          Enable your team to check in and out by scanning a QR code at each office
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual demo - QR with geofence */}
        <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="relative">
            <div className="h-24 w-24 rounded-xl bg-white dark:bg-gray-900 border-2 border-blue-300 dark:border-blue-700 flex items-center justify-center shadow-sm">
              <QrCode className="h-12 w-12 text-blue-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">100m Geofence</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Auto-verified location</p>
          </div>
        </div>

        {/* Key points - Owner perspective */}
        <div className="space-y-3">
          {[
            {
              icon: Building2,
              title: 'One QR per office',
              description: 'Each office gets its own unique QR code linked to its location. Team members scan to check in or out.',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: MapPin,
              title: '100m location verification',
              description: 'QR codes are automatically geofenced to within 100 meters of your office address. Only nearby team members can check in.',
              color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            },
            {
              icon: Download,
              title: 'Download & print',
              description: 'Download a printable A4 PDF with your company logo and clear instructions for team members.',
              color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            },
            {
              icon: RefreshCw,
              title: 'Regenerate anytime',
              description: 'Need to invalidate old codes? Regenerate a new QR for any office from Settings → Manage Offices.',
              color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-center">
            <span className="font-medium text-primary">💡 Pro tip:</span>{' '}
            <span className="text-muted-foreground">
              You can download QR codes anytime from Settings → Manage Offices, or from the Attendance QR button in your navigation.
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} disabled={isNavigating} className="h-12 px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={onContinue} disabled={isNavigating} className="flex-1 h-12 text-base font-semibold" size="lg">
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                I Understand
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
