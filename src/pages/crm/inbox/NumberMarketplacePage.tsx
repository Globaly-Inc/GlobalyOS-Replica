import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import {
  useOrgPhoneNumbers,
  useSearchNumbers,
  useProvisionNumber,
  useReleaseNumber,
} from '@/hooks/useTelephony';
import type { AvailableNumber } from '@/hooks/useTelephony';
import { InboxSubNav } from '@/components/inbox/InboxSubNav';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Phone, Search, ShoppingCart, Loader2, PhoneOff, Settings2, Smartphone, Copy } from 'lucide-react';
import { toast } from 'sonner';

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
];

const NumberMarketplacePage = () => {
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();
  const { data: myNumbers = [], isLoading: loadingNumbers } = useOrgPhoneNumbers();
  const searchMutation = useSearchNumbers();
  const provisionMutation = useProvisionNumber();
  const releaseMutation = useReleaseNumber();

  const [country, setCountry] = useState('US');
  const [areaCode, setAreaCode] = useState('');
  const [contains, setContains] = useState('');
  const [results, setResults] = useState<AvailableNumber[]>([]);
  const [searched, setSearched] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<AvailableNumber | null>(null);
  const [releaseNumber, setReleaseNumber] = useState<string | null>(null);

  const handleSearch = async () => {
    setSearched(true);
    try {
      const nums = await searchMutation.mutateAsync({
        country,
        area_code: areaCode || undefined,
        contains: contains || undefined,
        capabilities: { sms: true, voice: true },
      });
      setResults(nums);
    } catch {
      setResults([]);
    }
  };

  const handleBuy = async () => {
    if (!buyingNumber || !currentOrg?.id) return;
    await provisionMutation.mutateAsync({
      phone_number: buyingNumber.phone_number,
      friendly_name: buyingNumber.friendly_name,
      organization_id: currentOrg.id,
      country_code: buyingNumber.country_code,
      monthly_cost: buyingNumber.monthly_cost,
    });
    setBuyingNumber(null);
    setResults((prev) => prev.filter((n) => n.phone_number !== buyingNumber.phone_number));
  };

  const handleRelease = async () => {
    if (!releaseNumber || !currentOrg?.id) return;
    await releaseMutation.mutateAsync({
      phone_number_id: releaseNumber,
      organization_id: currentOrg.id,
    });
    setReleaseNumber(null);
  };

  const copyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast.success('Phone number copied!');
  };

  return (
    <div>
      <InboxSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phone Number Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search and provision phone numbers for SMS & Voice
          </p>
        </div>

        {/* My Numbers */}
        {loadingNumbers ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Your Numbers
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="border">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : myNumbers.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Your Numbers
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myNumbers.map((num) => (
                <Card key={num.id} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-mono">{num.phone_number}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyNumber(num.phone_number)}
                          title="Copy number"
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <Badge variant={num.status === 'active' ? 'default' : 'secondary'}>
                        {num.status}
                      </Badge>
                    </div>
                    {num.friendly_name && (
                      <CardDescription className="text-xs">{num.friendly_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{num.country_code}</span>
                      <span>•</span>
                      <span>${num.monthly_cost}/mo</span>
                      <span>•</span>
                      <div className="flex gap-1">
                        {num.capabilities?.sms && (
                          <Badge variant="outline" className="text-[10px] px-1">SMS</Badge>
                        )}
                        {num.capabilities?.voice && (
                          <Badge variant="outline" className="text-[10px] px-1">Voice</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex-1"
                        onClick={() => navigateOrg(`/crm/inbox/numbers/${num.id}/ivr`)}
                      >
                        <Settings2 className="h-3 w-3 mr-1" /> IVR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => setReleaseNumber(num.id)}
                        disabled={num.status !== 'active'}
                      >
                        <PhoneOff className="h-3 w-3 mr-1" /> Release
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <Card className="border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No phone numbers yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Search for available numbers below and provision one to start sending SMS and receiving calls.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Search Available Numbers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Area code (e.g. 415)"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                className="w-[140px]"
              />
              <Input
                placeholder="Contains..."
                value={contains}
                onChange={(e) => setContains(e.target.value)}
                className="w-[160px]"
              />
              <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Search
              </Button>
            </div>

            {/* Results */}
            {searched && (
              <div className="space-y-2">
                {results.length === 0 && !searchMutation.isPending && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No numbers found. Try adjusting your search.
                  </p>
                )}
                {results.length > 0 && (
                  <div className="rounded-md border divide-y">
                    {results.map((num) => (
                      <div
                        key={num.phone_number}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-mono font-medium">{num.phone_number}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{num.type}</span>
                              <span>•</span>
                              <span>${num.monthly_cost.toFixed(2)}/mo</span>
                              {num.capabilities?.sms && <Badge variant="outline" className="text-[10px] px-1">SMS</Badge>}
                              {num.capabilities?.voice && <Badge variant="outline" className="text-[10px] px-1">Voice</Badge>}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setBuyingNumber(num)}
                          disabled={provisionMutation.isPending}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Buy
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buy confirmation */}
        <AlertDialog open={!!buyingNumber} onOpenChange={(o) => !o && setBuyingNumber(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Provision {buyingNumber?.phone_number}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will purchase the number from Twilio at ${buyingNumber?.monthly_cost.toFixed(2)}/month.
                The number will be immediately available for SMS and Voice in your inbox.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={provisionMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBuy} disabled={provisionMutation.isPending}>
                {provisionMutation.isPending ? 'Provisioning...' : 'Confirm Purchase'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Release confirmation */}
        <AlertDialog open={!!releaseNumber} onOpenChange={(o) => !o && setReleaseNumber(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release this number?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently release this number back to Twilio. You will lose this number and any active conversations on it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={releaseMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRelease}
                disabled={releaseMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {releaseMutation.isPending ? 'Releasing...' : 'Release Number'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default NumberMarketplacePage;
