import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Clock, ArrowRight, Loader2 } from 'lucide-react';

const PortalServicesPage = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const { portalFetch } = usePortalApi();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const params: Record<string, string> = {};
        if (search) params.search = search;
        const result = await portalFetch('list-services', params);
        setServices(result.services || []);
      } catch (err) {
        console.error('Failed to fetch services:', err);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(fetchServices, 300);
    return () => clearTimeout(debounce);
  }, [portalFetch, search]);

  const basePath = `/org/${orgCode}/portal`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <p className="text-muted-foreground">Browse available services and submit applications.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No services available at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc: any) => (
            <Link key={svc.id} to={`${basePath}/services/${svc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{svc.name}</h3>
                      {svc.category && (
                        <Badge variant="secondary" className="text-xs shrink-0">{svc.category}</Badge>
                      )}
                    </div>
                    {svc.short_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.short_description}</p>
                    )}
                    {svc.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {svc.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    {svc.sla_target_days && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        ~{svc.sla_target_days} days
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-medium text-primary ml-auto">
                      Learn more <ArrowRight className="h-3 w-3" />
                    </span>
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

export default PortalServicesPage;
