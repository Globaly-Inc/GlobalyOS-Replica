/**
 * Getting Started Page
 * Step-by-step onboarding guide for new users
 */

import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Users, Calendar, Target, BookOpen, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportLayout } from '@/components/support/SupportLayout';

const GETTING_STARTED_STEPS = [
  {
    number: 1,
    title: 'Set Up Your Profile',
    description: 'Complete your profile with your photo, contact details, and preferences.',
    icon: Users,
    link: '/support/features/settings/profile-setup',
    details: [
      'Upload a profile photo',
      'Add your contact information',
      'Set your timezone and preferences',
      'Add your skills and superpowers',
    ],
  },
  {
    number: 2,
    title: 'Explore the Dashboard',
    description: 'Your home dashboard gives you a quick overview of everything happening.',
    icon: Target,
    link: '/support/features/general/dashboard-overview',
    details: [
      'View today\'s attendance status',
      'Check pending leave requests',
      'See team announcements',
      'Access quick actions',
    ],
  },
  {
    number: 3,
    title: 'Meet Your Team',
    description: 'Browse the team directory to see who\'s who in your organization.',
    icon: Users,
    link: '/support/features/team/team-directory',
    details: [
      'View the organization chart',
      'Find colleagues by department',
      'See contact information',
      'Connect with team members',
    ],
  },
  {
    number: 4,
    title: 'Track Your Time',
    description: 'Learn how to check in/out and manage your attendance.',
    icon: Calendar,
    link: '/support/features/attendance/check-in-out',
    details: [
      'Check in when you start work',
      'Check out at the end of your day',
      'View your attendance history',
      'Understand work hour calculations',
    ],
  },
  {
    number: 5,
    title: 'Request Time Off',
    description: 'Submit leave requests and track your leave balance.',
    icon: Calendar,
    link: '/support/features/leave/request-leave',
    details: [
      'View available leave types',
      'Check your leave balance',
      'Submit a leave request',
      'Track approval status',
    ],
  },
  {
    number: 6,
    title: 'Set Your Goals',
    description: 'Create KPIs and OKRs to track your performance.',
    icon: Target,
    link: '/support/features/kpi/create-kpi',
    details: [
      'Understand KPIs vs OKRs',
      'Create measurable goals',
      'Track your progress',
      'Get AI-powered insights',
    ],
  },
  {
    number: 7,
    title: 'Access the Knowledge Base',
    description: 'Find company policies, procedures, and documentation in the Wiki.',
    icon: BookOpen,
    link: '/support/features/wiki/getting-started',
    details: [
      'Navigate folders and pages',
      'Search for content',
      'Create your own pages',
      'Use the Ask AI feature',
    ],
  },
];

const SupportGettingStarted = () => {
  return (
    <SupportLayout 
      title="Getting Started with GlobalyOS"
      breadcrumbs={[{ label: 'Getting Started' }]}
    >
      <div className="max-w-4xl">
        <p className="text-lg text-muted-foreground mb-8">
          Welcome to GlobalyOS! Follow these steps to get the most out of your experience.
        </p>

        <div className="space-y-6">
          {GETTING_STARTED_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="ml-14">
                    <ul className="space-y-2 mb-4">
                      {step.details.map((detail, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                    <Link to={step.link}>
                      <Button variant="outline" size="sm">
                        Learn More
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Next Steps */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              For Administrators
            </CardTitle>
            <CardDescription>
              If you're an admin or HR manager, there are additional setup steps for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link to="/support/features/settings/organization-setup">
                <Button variant="outline" size="sm">Organization Setup</Button>
              </Link>
              <Link to="/support/features/team/invite-members">
                <Button variant="outline" size="sm">Invite Team Members</Button>
              </Link>
              <Link to="/support/features/leave/leave-policies">
                <Button variant="outline" size="sm">Configure Leave Policies</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SupportLayout>
  );
};

export default SupportGettingStarted;
