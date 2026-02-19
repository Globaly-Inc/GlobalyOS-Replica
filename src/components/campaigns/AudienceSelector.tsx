/**
 * Audience Selector — Recipients step in campaign wizard
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import type { AudienceSource, AudienceFilters } from '@/types/campaigns';

interface Props {
  source: AudienceSource;
  filters: AudienceFilters;
  onSourceChange: (s: AudienceSource) => void;
  onFiltersChange: (f: AudienceFilters) => void;
}

const sourceOptions: { value: AudienceSource; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'crm_contacts', label: 'CRM Contacts', icon: Users, description: 'All active contacts in your CRM' },
  { value: 'crm_companies', label: 'Company Contacts', icon: Building2, description: 'Contacts linked to companies' },
];

export const AudienceSelector = ({ source, filters, onSourceChange, onFiltersChange }: Props) => {
  const { currentOrg } = useOrganization();
  const [count, setCount] = useState<number | null>(null);
  const [missingEmail, setMissingEmail] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Load available tags
  useEffect(() => {
    if (!currentOrg?.id) return;
    supabase
      .from('crm_contacts')
      .select('tags')
      .eq('organization_id', currentOrg.id)
      .eq('is_archived', false)
      .then(({ data }) => {
        const allTags = new Set<string>();
        data?.forEach(c => c.tags?.forEach((t: string) => allTags.add(t)));
        setTags(Array.from(allTags));
      });
  }, [currentOrg?.id]);

  // Estimate recipient count
  useEffect(() => {
    if (!currentOrg?.id) return;
    setLoading(true);

    const estimate = async () => {
      try {
        let q = supabase
          .from('crm_contacts')
          .select('id, email', { count: 'exact' })
          .eq('organization_id', currentOrg.id)
          .eq('is_archived', false);

        if (filters.rating) q = q.eq('rating', filters.rating);
        if (filters.source) q = q.eq('source', filters.source);
        if (filters.tags && filters.tags.length > 0) q = q.contains('tags', filters.tags);

        const { data, count: total, error } = await q;
        if (error) throw error;

        const missing = (data ?? []).filter(c => !c.email).length;
        setCount(total ?? 0);
        setMissingEmail(missing);
      } catch {
        setCount(null);
      } finally {
        setLoading(false);
      }
    };

    estimate();
  }, [currentOrg?.id, source, filters]);

  const toggleTag = (tag: string) => {
    const current = filters.tags ?? [];
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    onFiltersChange({ ...filters, tags: next });
  };

  return (
    <div className="space-y-5">
      {/* Source selector */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Audience Source</Label>
        <div className="grid grid-cols-2 gap-2">
          {sourceOptions.map(opt => {
            const Icon = opt.icon;
            const isActive = source === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onSourceChange(opt.value)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                )}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <p className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium block">Filters <span className="text-muted-foreground font-normal">(optional)</span></Label>

        {/* Rating filter */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Rating</Label>
          <Select
            value={filters.rating ?? 'all'}
            onValueChange={v => onFiltersChange({ ...filters, rating: v === 'all' ? null : v as 'hot' | 'warm' | 'cold' })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="hot">🔥 Hot</SelectItem>
              <SelectItem value="warm">🤝 Warm</SelectItem>
              <SelectItem value="cold">❄️ Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => {
                const selected = (filters.tags ?? []).includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={selected ? 'default' : 'outline'}
                    className="cursor-pointer text-xs select-none"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recipient count */}
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        count !== null && count > 0 ? 'border-green-200 bg-green-50' : 'border-border bg-muted/30'
      )}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <Users className={cn('h-4 w-4 shrink-0', count && count > 0 ? 'text-green-600' : 'text-muted-foreground')} />
        )}
        <div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Counting recipients…</p>
          ) : count !== null ? (
            <>
              <p className="text-sm font-medium text-foreground">
                <span className={cn('font-bold', count > 0 ? 'text-green-700' : 'text-muted-foreground')}>{count}</span>
                {' '}recipient{count !== 1 ? 's' : ''} selected
              </p>
              {missingEmail > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <AlertCircle className="h-3 w-3" />
                  {missingEmail} contact{missingEmail !== 1 ? 's' : ''} missing email (will be skipped)
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Could not estimate recipients</p>
          )}
        </div>
      </div>
    </div>
  );
};
