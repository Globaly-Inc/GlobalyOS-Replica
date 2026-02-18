/**
 * Duplicate Detector Card
 * Shows potential duplicates on profile pages with merge option.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { MergeDialog } from './MergeDialog';
import type { CRMContact, CRMCompany } from '@/types/crm';

interface ContactProps {
  type: 'contact';
  current: CRMContact;
  duplicates: CRMContact[];
}

interface CompanyProps {
  type: 'company';
  current: CRMCompany;
  duplicates: CRMCompany[];
}

type Props = ContactProps | CompanyProps;

export const DuplicateDetector = (props: Props) => {
  const [mergeTarget, setMergeTarget] = useState<CRMContact | CRMCompany | null>(null);

  if (props.duplicates.length === 0) return null;

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-800">
                {props.duplicates.length} possible duplicate{props.duplicates.length > 1 ? 's' : ''} found
              </p>
              <div className="mt-2 space-y-2">
                {props.duplicates.map((dup) => {
                  const name = props.type === 'contact'
                    ? `${(dup as CRMContact).first_name} ${(dup as CRMContact).last_name || ''}`
                    : (dup as CRMCompany).name;
                  const email = props.type === 'contact'
                    ? (dup as CRMContact).email
                    : (dup as CRMCompany).email;
                  return (
                    <div key={dup.id} className="flex items-center justify-between gap-2 p-2 rounded bg-background">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {email && <p className="text-xs text-muted-foreground">{email}</p>}
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => setMergeTarget(dup)}>
                        Merge
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {mergeTarget && (
        <MergeDialog
          open={!!mergeTarget}
          onOpenChange={(open) => !open && setMergeTarget(null)}
          type={props.type}
          primary={props.current as any}
          duplicate={mergeTarget as any}
        />
      )}
    </>
  );
};
