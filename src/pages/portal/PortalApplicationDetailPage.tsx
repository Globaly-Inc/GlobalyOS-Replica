import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const statusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  submitted: 'secondary',
  in_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  completed: 'secondary',
};

const PortalApplicationDetailPage = () => {
  const { orgCode, applicationId } = useParams<{ orgCode: string; applicationId: string }>();
  const navigate = useNavigate();
  const { portalFetch } = usePortalApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const result = await portalFetch('get-application', { applicationId: applicationId! });
        setData(result);
      } catch (err) {
        console.error('Failed to fetch application:', err);
      } finally {
        setLoading(false);
      }
    };
    if (applicationId) fetchApp();
  }, [portalFetch, applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.application) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Application not found.</p>
        <Button variant="link" onClick={() => navigate(`/org/${orgCode}/portal/applications`)}>
          Back to applications
        </Button>
      </div>
    );
  }

  const app = data.application;
  const service = app.service;
  const history = data.statusHistory || [];
  const documents = data.documents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/org/${orgCode}/portal/applications`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{service?.name || 'Application'}</h1>
          <p className="text-sm text-muted-foreground">
            {app.submitted_at ? `Submitted ${format(new Date(app.submitted_at), 'dd MMM yyyy')}` : `Created ${format(new Date(app.created_at), 'dd MMM yyyy')}`}
          </p>
        </div>
        <Badge variant={statusVariants[app.status] || 'outline'} className="capitalize text-sm">
          {app.status?.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>Progress Timeline</CardTitle></CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((entry: any, i: number) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${i === history.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                        {i < history.length - 1 && <div className="w-px h-8 bg-border" />}
                      </div>
                      <div className="pb-4">
                        <Badge variant={statusVariants[entry.new_status] || 'outline'} className="capitalize text-xs">
                          {entry.new_status?.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                        {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No timeline entries yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                        </div>
                      </div>
                      <Badge
                        variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'outline'}
                        className="capitalize text-xs"
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Service</p>
                <p className="text-sm font-medium">{service?.name}</p>
              </div>
              {service?.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm">{service.category}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <p className="text-sm capitalize">{app.priority}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusVariants[app.status] || 'outline'} className="capitalize">
                  {app.status?.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PortalApplicationDetailPage;
