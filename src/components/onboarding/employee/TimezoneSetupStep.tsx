/**
 * Employee Onboarding - Timezone Setup Step
 * Location-based timezone setup with permission request
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, MapPin, Globe, Clock, Check, Loader2, AlertTriangle } from 'lucide-react';
import { TimezoneSelector } from '@/components/ui/timezone-selector';

interface TimezoneSetupStepProps {
  onSave: (timezone: string) => void;
  onBack?: () => void;
  isSaving: boolean;
}

type LocationState = 'idle' | 'requesting' | 'success' | 'denied' | 'error';

export function TimezoneSetupStep({ onSave, onBack, isSaving }: TimezoneSetupStepProps) {
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');

  const handleRequestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationState('error');
      return;
    }

    setLocationState('requesting');

    navigator.geolocation.getCurrentPosition(
      () => {
        // On success, detect timezone from browser
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDetectedTimezone(browserTimezone);
        setSelectedTimezone(browserTimezone);
        setLocationState('success');
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Still get browser timezone as fallback
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDetectedTimezone(browserTimezone);
        setSelectedTimezone(browserTimezone);
        
        if (error.code === error.PERMISSION_DENIED) {
          setLocationState('denied');
        } else {
          setLocationState('error');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleContinue = () => {
    if (selectedTimezone) {
      onSave(selectedTimezone);
    }
  };

  const handleSkipToManual = () => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(browserTimezone);
    setSelectedTimezone(browserTimezone);
    setLocationState('denied');
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Set Your Timezone</CardTitle>
        <CardDescription className="text-base max-w-md mx-auto">
          We use your timezone to show accurate check-in times, meetings, and notifications in your local time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="grid gap-3">
          {[
            { icon: Clock, text: 'See accurate check-in and check-out times' },
            { icon: MapPin, text: 'Meetings displayed in your local time' },
            { icon: Globe, text: 'Deadlines and reminders sync correctly' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Location state handling */}
        {locationState === 'idle' && (
          <div className="space-y-4">
            <Button 
              onClick={handleRequestLocation} 
              className="w-full h-12" 
              size="lg"
            >
              <MapPin className="mr-2 h-5 w-5" />
              Allow Location Access
            </Button>
            <button
              onClick={handleSkipToManual}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Or select timezone manually
            </button>
            {onBack && (
              <Button 
                type="button"
                variant="outline"
                onClick={onBack}
                className="w-full h-12"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
        )}

        {locationState === 'requesting' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Detecting your location...</p>
          </div>
        )}

        {locationState === 'success' && detectedTimezone && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Timezone detected
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {detectedTimezone}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Not correct? Select a different timezone:
              </label>
              <TimezoneSelector
                value={selectedTimezone}
                onChange={setSelectedTimezone}
              />
            </div>

            <div className="flex gap-3">
              {onBack && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="h-12 px-6"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleContinue} 
                disabled={!selectedTimezone || isSaving}
                className="flex-1 h-12" 
                size="lg"
              >
                {isSaving ? 'Saving...' : 'Continue'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {(locationState === 'denied' || locationState === 'error') && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {locationState === 'denied' 
                      ? 'Location access not granted' 
                      : 'Unable to detect location'}
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    No worries! We've detected your browser's timezone. You can also select manually below.
                  </p>
                </div>
              </div>
            </div>

            {detectedTimezone && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Detected: <span className="font-medium text-foreground">{detectedTimezone}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Select your timezone:</label>
              <TimezoneSelector
                value={selectedTimezone}
                onChange={setSelectedTimezone}
              />
            </div>

            <div className="flex gap-3">
              {onBack && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="h-12 px-6"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleContinue} 
                disabled={!selectedTimezone || isSaving}
                className="flex-1 h-12" 
                size="lg"
              >
                {isSaving ? 'Saving...' : 'Continue'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
