import { useQuery } from '@tanstack/react-query';
import { useAgentApi } from '@/hooks/useAgentApi';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';

const AgentServicesPage = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const navigate = useNavigate();
  const { agentFetch } = useAgentApi();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['agent-services'],
    queryFn: () => agentFetch('list-services'),
  });

  const services = (data?.services || []).filter((s: any) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground">Browse available services to apply for your customers</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No services available at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service: any) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/agent/${orgCode}/services/${service.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  {service.category && <Badge variant="secondary">{service.category}</Badge>}
                </div>
                <CardDescription className="line-clamp-2">{service.short_description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {service.sla_target_days && (
                    <span className="text-xs text-muted-foreground">
                      ~{service.sla_target_days} days processing
                    </span>
                  )}
                  <Button variant="ghost" size="sm">
                    View Details <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentServicesPage;
