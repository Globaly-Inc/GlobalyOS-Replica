import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';

const PortalMessagesPage = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const { portalFetch } = usePortalApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await portalFetch('dashboard');
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [portalFetch]);

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
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">View messages for each of your cases.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!data?.cases?.length ? (
            <p className="text-muted-foreground text-sm text-center py-4">No cases with messages.</p>
          ) : (
            <div className="space-y-3">
              {data.cases.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/org/${orgCode}/portal/cases/${c.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">Click to view messages</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalMessagesPage;
