import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PortalServiceDetailPage = () => {
  const { orgCode, serviceId } = useParams<{ orgCode: string; serviceId: string }>();
  const navigate = useNavigate();
  const { portalFetch } = usePortalApi();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const result = await portalFetch('get-service', { serviceId: serviceId! });
        setService(result.service);
      } catch (err) {
        console.error('Failed to fetch service:', err);
      } finally {
        setLoading(false);
      }
    };
    if (serviceId) fetchService();
  }, [portalFetch, serviceId]);

  const handleApply = async () => {
    try {
      setApplying(true);
      const result = await portalFetch('apply-service', undefined, {
        serviceId: serviceId,
      });
      toast.success('Application submitted successfully!');
      navigate(`/org/${orgCode}/portal/applications/${result.application.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Service not found.</p>
        <Button variant="link" onClick={() => navigate(`/org/${orgCode}/portal/services`)}>
          Back to services
        </Button>
      </div>
    );
  }

  const requiredDocs = service.required_docs_template || [];
  const stages = service.workflow_stages || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/org/${orgCode}/portal/services`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{service.name}</h1>
          {service.category && <Badge variant="secondary" className="mt-1">{service.category}</Badge>}
        </div>
        <Button onClick={handleApply} disabled={applying}>
          {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Apply Now
        </Button>
      </div>

      {service.short_description && (
        <p className="text-muted-foreground">{service.short_description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {service.long_description && (
            <Card>
              <CardHeader><CardTitle>About this service</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.long_description}</p>
              </CardContent>
            </Card>
          )}

          {stages.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Process Steps</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stages.sort((a: any, b: any) => a.order - b.order).map((stage: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{stage.name}</p>
                        {stage.description && <p className="text-xs text-muted-foreground">{stage.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {service.sla_target_days && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Estimated processing: <strong>~{service.sla_target_days} days</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {requiredDocs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Required Documents</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requiredDocs.map((doc: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                        {doc.required && <Badge variant="outline" className="text-xs mt-1">Required</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {service.tags?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-1">
                  {service.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalServiceDetailPage;
