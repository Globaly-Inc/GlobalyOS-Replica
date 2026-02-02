/**
 * Public Careers Page
 * Lists all open jobs for an organization (no auth required)
 */

import { useParams } from 'react-router-dom';
import { usePublicJobs } from '@/services/useHiring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building2,
  ArrowRight,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { 
  JOB_STATUS_LABELS, 
  WORK_MODEL_LABELS, 
  EMPLOYMENT_TYPE_LABELS 
} from '@/types/hiring';
import { HelmetProvider, Helmet } from 'react-helmet-async';

export default function CareersPage() {
  const { orgCode } = useParams<{ orgCode: string }>();
  const [search, setSearch] = useState('');
  
  const { data: jobs, isLoading, error } = usePublicJobs(orgCode);

  const filteredJobs = jobs?.filter(job => 
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.location?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Page Not Found</h2>
            <p className="text-muted-foreground">
              This careers page doesn't exist or is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>Careers | Join Our Team</title>
        <meta name="description" content="Explore open positions and join our growing team." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Join Our Team
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              Discover opportunities to grow your career with us. We're looking for talented people to help shape the future.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="container mx-auto px-4 -mt-8">
          <Card className="shadow-lg">
            <CardContent className="py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by title or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-6">
                    <Skeleton className="h-6 w-1/3 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Open Positions</h3>
                <p className="text-muted-foreground">
                  {search 
                    ? "No jobs match your search. Try different keywords."
                    : "We don't have any open positions right now. Check back soon!"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">
                {filteredJobs.length} open position{filteredJobs.length !== 1 ? 's' : ''}
              </p>
              
              {filteredJobs.map((job) => (
                <Link 
                  key={job.id} 
                  to={`/careers/${orgCode}/${job.slug}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="py-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {WORK_MODEL_LABELS[job.work_model]}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {EMPLOYMENT_TYPE_LABELS[job.employment_type]}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {job.salary_visible && job.salary_min && (
                              <Badge variant="outline">
                                {job.salary_currency} {job.salary_min.toLocaleString()}
                                {job.salary_max && ` - ${job.salary_max.toLocaleString()}`}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>Powered by GlobalyOS</p>
          </div>
        </div>
      </div>
    </HelmetProvider>
  );
}
