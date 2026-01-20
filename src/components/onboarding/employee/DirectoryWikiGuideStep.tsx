/**
 * Employee Onboarding - Directory & Wiki Guide Step
 * Brief intro to team directory, org chart, and wiki
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Users, Network, BookOpen, Search, FolderOpen } from 'lucide-react';

interface DirectoryWikiGuideStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function DirectoryWikiGuideStep({ onContinue, onBack }: DirectoryWikiGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
          <Users className="h-8 w-8 text-cyan-600" />
        </div>
        <CardTitle className="text-2xl">Find People & Knowledge</CardTitle>
        <CardDescription className="text-base">
          Everything you need to know, all in one place
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Three main features */}
        <div className="grid gap-4">
          {/* Team Directory */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Team Directory</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Find colleagues by name, department, or role. View profiles and contact details.
                </p>
              </div>
            </div>
          </div>

          {/* Org Chart */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Org Chart</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Visualize the organizational structure. See reporting lines and teams.
                </p>
              </div>
            </div>
          </div>

          {/* Wiki */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">Wiki & Knowledge Base</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Access policies, how-tos, documentation, and everything you need to know.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick tips */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Use search to find anything quickly</span>
          </div>
          <div className="flex-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Wiki pages are organized in folders</span>
          </div>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="h-12 px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={onContinue} className="flex-1 h-12 text-base font-semibold" size="lg">
            Almost Done
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
