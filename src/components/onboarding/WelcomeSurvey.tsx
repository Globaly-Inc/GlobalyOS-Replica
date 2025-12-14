import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  BookOpen, 
  MessageSquare,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  CheckCircle2
} from 'lucide-react';

interface WelcomeSurveyProps {
  open: boolean;
  onComplete: () => void;
}

const GOALS = [
  { id: 'team_management', label: 'Team Management', description: 'Manage employee profiles & directory', icon: Users },
  { id: 'leave_tracking', label: 'Leave & Attendance', description: 'Track time off and work hours', icon: Calendar },
  { id: 'performance', label: 'Performance Reviews', description: 'KPIs, OKRs and reviews', icon: BarChart3 },
  { id: 'knowledge_base', label: 'Knowledge Base', description: 'Wiki and documentation', icon: BookOpen },
  { id: 'communication', label: 'Team Communication', description: 'Chat and announcements', icon: MessageSquare },
];

const TEAM_SIZES = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

const FEATURES = [
  { id: 'directory', label: 'Team Directory', icon: Users },
  { id: 'leave', label: 'Leave Management', icon: Calendar },
  { id: 'attendance', label: 'Attendance Tracking', icon: Clock },
  { id: 'kpis', label: 'KPIs & OKRs', icon: Target },
  { id: 'wiki', label: 'Wiki', icon: BookOpen },
  { id: 'chat', label: 'Team Chat', icon: MessageSquare },
];

export const WelcomeSurvey = ({ open, onComplete }: WelcomeSurveyProps) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Survey responses
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [priorityFeatures, setPriorityFeatures] = useState<string[]>([]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const toggleFeature = (featureId: string) => {
    setPriorityFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return primaryGoal !== null;
      case 2: return teamSize !== null;
      case 3: return priorityFeatures.length > 0;
      default: return true;
    }
  };

  const handleComplete = async () => {
    if (!user?.id || !currentOrg?.id) return;
    
    setLoading(true);
    try {
      // Save survey responses
      await supabase.from('welcome_survey_responses').upsert({
        user_id: user.id,
        organization_id: currentOrg.id,
        primary_goal: primaryGoal,
        team_size: teamSize,
        priority_features: priorityFeatures,
        completed_at: new Date().toISOString(),
      });

      // Update onboarding progress
      await supabase.from('onboarding_progress').upsert({
        user_id: user.id,
        organization_id: currentOrg.id,
        role: 'member',
        survey_completed: true,
      }, { onConflict: 'user_id,organization_id' });

      toast({
        title: "Welcome to GlobalyOS!",
        description: "Your workspace is personalized based on your preferences.",
      });

      onComplete();
    } catch (error) {
      console.error('Error saving survey:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">Let's personalize your experience</DialogTitle>
              <DialogDescription>Step {step} of {totalSteps}</DialogDescription>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Primary Goal */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">What's your main goal with GlobalyOS?</h3>
              <div className="grid gap-2">
                {GOALS.map((goal) => {
                  const Icon = goal.icon;
                  const isSelected = primaryGoal === goal.id;
                  return (
                    <Card
                      key={goal.id}
                      className={cn(
                        "p-3 cursor-pointer transition-all hover:border-primary/50",
                        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                      onClick={() => setPrimaryGoal(goal.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{goal.label}</p>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Team Size */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">How many people are on your team?</h3>
              <p className="text-sm text-muted-foreground">This helps us suggest the right setup for you.</p>
              <div className="grid grid-cols-5 gap-2">
                {TEAM_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setTeamSize(size.value)}
                    className={cn(
                      "py-3 px-2 rounded-lg border text-center font-medium transition-all",
                      teamSize === size.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 text-foreground"
                    )}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Priority Features */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Which features matter most to you?</h3>
              <p className="text-sm text-muted-foreground">Select all that apply. We'll highlight these in your dashboard.</p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  const isSelected = priorityFeatures.includes(feature.id);
                  return (
                    <button
                      key={feature.id}
                      onClick={() => toggleFeature(feature.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all flex items-center gap-2",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{feature.label}</span>
                    </button>
                  );
                })}
              </div>
              {priorityFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {priorityFeatures.map(id => {
                    const feature = FEATURES.find(f => f.id === id);
                    return feature ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {feature.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()} 
              className="flex-1"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={loading || !canProceed()} 
              className="flex-1"
            >
              {loading ? "Setting up..." : "Get Started"}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
