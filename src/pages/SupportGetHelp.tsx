/**
 * Get Help Page
 * Provides options to request features, report bugs, and view requests
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Bug, ClipboardList, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportLayout } from '@/components/support/SupportLayout';
import { GetHelpDialog } from '@/components/support/GetHelpDialog';
import { useSupportRequestStats } from '@/services/useSupportRequests';
import { Skeleton } from '@/components/ui/skeleton';

const SupportGetHelp = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'feature' | 'bug'>('feature');
  const { data: stats, isLoading: statsLoading } = useSupportRequestStats();

  const openDialog = (type: 'feature' | 'bug') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  return (
    <SupportLayout title="Get Help" breadcrumbs={[{ label: 'Get Help' }]}>
      <p className="text-muted-foreground mb-8">
        Choose how you'd like to reach out to us. We're here to help!
      </p>

      <div className="space-y-6">
        {/* Request a Feature */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Request a Feature</CardTitle>
                <CardDescription className="mt-1">
                  Have an idea to improve GlobalyOS? We'd love to hear it!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="pl-16">
              <p className="text-sm font-medium text-muted-foreground mb-2">When to use:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  You want to suggest a new capability
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  You have ideas for improving existing features
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  You need a workflow that doesn't exist yet
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t flex items-center justify-between py-4">
            <Button onClick={() => openDialog('feature')}>
              Request Feature
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : stats?.features ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {stats.features.inProgress} in progress
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {stats.features.releaseRate}% release rate
                  </span>
                </>
              ) : null}
            </div>
          </CardFooter>
        </Card>

        {/* Report a Bug */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <Bug className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Report a Bug</CardTitle>
                <CardDescription className="mt-1">
                  Found something that isn't working right? Let us know!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="pl-16">
              <p className="text-sm font-medium text-muted-foreground mb-2">When to use:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Something is broken or not working as expected
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  You're seeing error messages
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Performance issues or slow loading
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t flex items-center justify-between py-4">
            <Button onClick={() => openDialog('bug')} variant="destructive">
              Report Bug
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : stats?.bugs ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {stats.bugs.inProgress} in progress
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {stats.bugs.resolutionRate}% resolution rate
                  </span>
                </>
              ) : null}
            </div>
          </CardFooter>
        </Card>

        {/* View Your Requests */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">View Your Requests</CardTitle>
                <CardDescription className="mt-1">
                  Track the status of your submitted requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="pl-16">
              <p className="text-sm font-medium text-muted-foreground mb-2">When to use:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Check the progress of your bug reports
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  See updates on your feature requests
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  View responses from our team
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
            <Button variant="outline" asChild>
              <Link to="/support/my-requests">
                View Requests
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <GetHelpDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        defaultType={dialogType}
      />
    </SupportLayout>
  );
};

export default SupportGetHelp;
