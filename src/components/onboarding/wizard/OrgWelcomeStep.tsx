/**
 * Organization Onboarding - Welcome Step with Feature Selection
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURES, getDefaultEnabledFeatures } from './FeatureSelectionStep';

interface OrgWelcomeStepProps {
  ownerName: string;
  orgName: string;
  initialFeatures: string[];
  onContinue: (enabledFeatures: string[]) => void;
}

export function OrgWelcomeStep({ ownerName, orgName, initialFeatures, onContinue }: OrgWelcomeStepProps) {
  // Initialize with core features always included
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(() => {
    const initial = initialFeatures.length > 0 
      ? new Set(initialFeatures)
      : new Set(getDefaultEnabledFeatures());
    // Always ensure core features are enabled
    FEATURES.filter(f => f.isCore).forEach(f => initial.add(f.id));
    // Always ensure coming soon features are disabled
    FEATURES.filter(f => f.comingSoon).forEach(f => initial.delete(f.id));
    return initial;
  });

  const toggleFeature = (feature: typeof FEATURES[0]) => {
    if (feature.isCore || feature.comingSoon) return;
    
    const newSet = new Set(enabledFeatures);
    if (newSet.has(feature.id)) {
      newSet.delete(feature.id);
    } else {
      newSet.add(feature.id);
    }
    setEnabledFeatures(newSet);
  };

  const handleContinue = () => {
    // Always include core features
    const features = Array.from(enabledFeatures);
    FEATURES.filter(f => f.isCore).forEach(f => {
      if (!features.includes(f.id)) features.push(f.id);
    });
    onContinue(features);
  };

  const renderFeatureItem = (feature: typeof FEATURES[0]) => {
    const Icon = feature.icon;
    const isEnabled = enabledFeatures.has(feature.id);
    const isDisabled = feature.isCore || feature.comingSoon;

    return (
      <div
        key={feature.id}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-all',
          feature.comingSoon
            ? 'border-border bg-muted/20 opacity-60'
            : isEnabled
              ? 'border-primary/50 bg-primary/5'
              : 'border-border bg-muted/30 hover:bg-muted/50',
          !isDisabled && 'cursor-pointer'
        )}
        onClick={() => !isDisabled && toggleFeature(feature)}
      >
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
            feature.comingSoon
              ? 'bg-muted'
              : isEnabled 
                ? 'bg-primary/20' 
                : 'bg-background'
          )}
        >
          <Icon className={cn(
            'h-4 w-4', 
            feature.comingSoon
              ? 'text-muted-foreground'
              : isEnabled 
                ? 'text-primary' 
                : 'text-muted-foreground'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-medium text-sm",
              feature.comingSoon && "text-muted-foreground"
            )}>
              {feature.name}
            </span>
            {feature.isCore && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0 px-1.5 py-0">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                Core
              </Badge>
            )}
            {feature.comingSoon && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                Coming Soon
              </Badge>
            )}
          </div>
          <p className={cn(
            "text-xs line-clamp-1",
            feature.comingSoon ? "text-muted-foreground/70" : "text-muted-foreground"
          )}>
            {feature.description}
          </p>
        </div>

        <Switch
          checked={isEnabled}
          onCheckedChange={() => toggleFeature(feature)}
          onClick={(e) => e.stopPropagation()}
          disabled={isDisabled}
          className={cn(
            "scale-90",
            feature.isCore && "opacity-50",
            feature.comingSoon && "opacity-30 cursor-not-allowed"
          )}
        />
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl md:text-3xl">
          Welcome to GlobalyOS, {ownerName.split(' ')[0]}! 🎉
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Let's set up <span className="font-medium text-foreground">{orgName}</span>. Choose the features you'd like to enable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {FEATURES.map(renderFeatureItem)}
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleContinue} 
            className="w-full h-12 text-base"
            size="lg"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Takes about 5 minutes • You can change features later in Settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
