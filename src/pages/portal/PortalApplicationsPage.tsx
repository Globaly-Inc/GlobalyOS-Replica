import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileStack, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const statusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  submitted: 'secondary',
  in_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  completed: 'secondary',
};

const PortalApplicationsPage = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const { portalFetch } = usePortalApi();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const result = await portalFetch('list-my-applications');
        setApplications(result.applications || []);
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [portalFetch]);

  const basePath = `/org/${orgCode}/portal`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="text-muted-foreground">Track the progress of your service applications.</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileStack className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No applications yet.</p>
          <Link to={`${basePath}/services`} className="text-primary text-sm hover:underline">
            Browse services
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app: any) => (
            <Link key={app.id} to={`${basePath}/applications/${app.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileStack className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{app.service?.name || 'Unknown Service'}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.submitted_at ? `Submitted ${format(new Date(app.submitted_at), 'dd MMM yyyy')}` : `Created ${format(new Date(app.created_at), 'dd MMM yyyy')}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariants[app.status] || 'outline'} className="capitalize">
                      {app.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalApplicationsPage;
