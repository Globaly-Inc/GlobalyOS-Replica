/**
 * Employee Onboarding - Social Feed Guide Step
 * Explains home feed and social features, encourages engagement
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Home, Trophy, Heart, MessageSquare, Megaphone, Sparkles } from 'lucide-react';

interface SocialFeedGuideStepProps {
  onContinue: () => void;
}

export function SocialFeedGuideStep({ onContinue }: SocialFeedGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Home className="h-8 w-8 text-orange-600" />
        </div>
        <CardTitle className="text-2xl">Home & Social Feed</CardTitle>
        <CardDescription className="text-base">
          Stay connected with your team and celebrate together
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Engagement teaser */}
        <div className="p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary shrink-0" />
            <p className="text-sm font-medium">
              Your Home page is where the team comes together. Engage, celebrate, and stay in the loop!
            </p>
          </div>
        </div>

        {/* Key points */}
        <div className="space-y-3">
          {[
            {
              icon: Home,
              title: 'Your personalized feed',
              description: 'See updates, posts, and activities from your colleagues.',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: Trophy,
              title: 'Celebrate wins',
              description: 'Share achievements and milestones with the team. 🎉',
              color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            },
            {
              icon: Heart,
              title: 'Give kudos',
              description: 'Recognize and appreciate your colleagues\' great work.',
              color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
            },
            {
              icon: Megaphone,
              title: 'Announcements',
              description: 'Stay updated with important company-wide news.',
              color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            },
            {
              icon: MessageSquare,
              title: 'Engage & comment',
              description: 'React to posts, leave comments, and join conversations.',
              color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
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

        {/* Encouragement */}
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Don't be shy! Your first post is waiting. 💬
          </p>
        </div>

        <Button onClick={onContinue} className="w-full h-12 text-base font-semibold" size="lg">
          Let's Go
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
