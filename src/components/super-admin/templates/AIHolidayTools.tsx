import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Globe, Calendar, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { COUNTRIES, getFlagEmoji } from '@/lib/countries';
import { toast } from 'sonner';

interface TemplateHoliday {
  id: string;
  country_code: string;
  country_name: string;
  title: string;
  month: number;
  day: number | null;
  is_movable: boolean;
  is_active: boolean;
}

interface AIHolidayToolsProps {
  holidays: TemplateHoliday[];
  countriesWithHolidays: number;
  totalCountries: number;
}

export function AIHolidayTools({ holidays, countriesWithHolidays, totalCountries }: AIHolidayToolsProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'selecting' | 'generating' | 'done' | 'error'>('selecting');
  const [results, setResults] = useState<{ country: string; success: boolean; count?: number; error?: string }[]>([]);

  // Get countries without holidays
  const countriesWithHolidaysCodes = new Set(holidays.map(h => h.country_code));
  const missingCountries = COUNTRIES.filter(c => !countriesWithHolidaysCodes.has(c.code));

  const generateMutation = useMutation({
    mutationFn: async (countries: string[]) => {
      const allResults: { country: string; success: boolean; count?: number; error?: string }[] = [];
      
      for (let i = 0; i < countries.length; i++) {
        const countryCode = countries[i];
        const country = COUNTRIES.find(c => c.code === countryCode);
        if (!country) continue;

        setProgress(Math.round(((i + 1) / countries.length) * 100));

        try {
          const { data, error } = await supabase.functions.invoke('generate-country-holidays', {
            body: { countryCode, countryName: country.name },
          });

          if (error) throw error;
          
          allResults.push({
            country: country.name,
            success: true,
            count: data?.holidaysCreated || 0,
          });
        } catch (err) {
          allResults.push({
            country: country.name,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return allResults;
    },
    onSuccess: (results) => {
      setResults(results);
      setStatus('done');
      queryClient.invalidateQueries({ queryKey: ['template-holidays'] });
      
      const successCount = results.filter(r => r.success).length;
      const totalHolidays = results.reduce((acc, r) => acc + (r.count || 0), 0);
      
      if (successCount === results.length) {
        toast.success(`Generated ${totalHolidays} holidays for ${successCount} countries`);
      } else {
        toast.warning(`Generated holidays for ${successCount}/${results.length} countries`);
      }
    },
    onError: (error) => {
      setStatus('error');
      toast.error('Failed to generate holidays: ' + error.message);
    },
  });

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setStatus('selecting');
    setProgress(0);
    setResults([]);
    setSelectedCountries([]);
  };

  const handleCloseDialog = () => {
    if (status === 'generating') return; // Don't close while generating
    setIsDialogOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedCountries(missingCountries.map(c => c.code));
  };

  const handleClearAll = () => {
    setSelectedCountries([]);
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleGenerate = () => {
    if (selectedCountries.length === 0) {
      toast.error('Please select at least one country');
      return;
    }
    setStatus('generating');
    generateMutation.mutate(selectedCountries);
  };

  const missingCount = missingCountries.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Holiday Tools
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleOpenDialog}
            disabled={missingCount === 0}
          >
            <Globe className="h-4 w-4 mr-2" />
            Generate for Missing Countries
            {missingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {missingCount}
              </Badge>
            )}
          </Button>
        </div>

        {missingCount === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            ✓ All {totalCountries} countries have holiday templates configured
          </p>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Generate Country Holidays
            </DialogTitle>
            <DialogDescription>
              Use AI to generate public holiday templates for countries that don't have any configured.
            </DialogDescription>
          </DialogHeader>

          {status === 'selecting' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {selectedCountries.length} of {missingCountries.length} selected
                </span>
                <div className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    Clear
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px] border rounded-md p-2">
                <div className="grid grid-cols-2 gap-2">
                  {missingCountries.map((country) => (
                    <label
                      key={country.code}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCountries.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code)}
                      />
                      <span className="text-lg">{getFlagEmoji(country.code)}</span>
                      <span className="text-sm truncate">{country.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={selectedCountries.length === 0}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate ({selectedCountries.length})
                </Button>
              </DialogFooter>
            </>
          )}

          {status === 'generating' && (
            <div className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Generating holidays... {progress}%
                </p>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          )}

          {(status === 'done' || status === 'error') && (
            <>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-md ${
                        result.success ? 'bg-accent/50' : 'bg-destructive/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm font-medium">{result.country}</span>
                      </div>
                      {result.success ? (
                        <Badge variant="secondary">{result.count} holidays</Badge>
                      ) : (
                        <span className="text-xs text-destructive">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button onClick={handleCloseDialog}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
