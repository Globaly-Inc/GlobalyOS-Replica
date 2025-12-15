import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronRight, 
  ChevronDown,
  Table2,
  Lock,
  Database,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'rls' | 'injection' | 'isolation' | 'auth' | 'config';
  title: string;
  description: string;
  affectedTable?: string;
  affectedPolicy?: string;
  remediation: string;
  status: 'open' | 'resolved' | 'ignored';
  detectedAt: string;
  resolvedAt?: string;
}

interface SecurityFindingsCardProps {
  findings: SecurityFinding[];
  onResolve?: (findingId: string) => void;
  onIgnore?: (findingId: string) => void;
}

const SecurityFindingsCard = ({ findings, onResolve, onIgnore }: SecurityFindingsCardProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { 
          icon: <AlertTriangle className="h-4 w-4" />, 
          color: 'bg-destructive text-destructive-foreground',
          border: 'border-l-destructive'
        };
      case 'high':
        return { 
          icon: <AlertCircle className="h-4 w-4" />, 
          color: 'bg-destructive/80 text-destructive-foreground',
          border: 'border-l-destructive/80'
        };
      case 'medium':
        return { 
          icon: <AlertTriangle className="h-4 w-4" />, 
          color: 'bg-warning text-warning-foreground',
          border: 'border-l-warning'
        };
      case 'low':
        return { 
          icon: <Info className="h-4 w-4" />, 
          color: 'bg-primary/20 text-primary',
          border: 'border-l-primary'
        };
      default:
        return { 
          icon: <Info className="h-4 w-4" />, 
          color: 'bg-muted text-muted-foreground',
          border: 'border-l-muted-foreground'
        };
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'rls':
        return { icon: <Lock className="h-4 w-4" />, label: 'RLS Policy' };
      case 'injection':
        return { icon: <Database className="h-4 w-4" />, label: 'SQL Injection' };
      case 'isolation':
        return { icon: <Table2 className="h-4 w-4" />, label: 'Tenant Isolation' };
      case 'auth':
        return { icon: <Shield className="h-4 w-4" />, label: 'Authentication' };
      case 'config':
        return { icon: <AlertCircle className="h-4 w-4" />, label: 'Configuration' };
      default:
        return { icon: <Shield className="h-4 w-4" />, label: 'Security' };
    }
  };

  const filteredFindings = findings.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'open') return f.status === 'open';
    if (filter === 'resolved') return f.status === 'resolved' || f.status === 'ignored';
    return true;
  });

  const openCount = findings.filter(f => f.status === 'open').length;
  const criticalCount = findings.filter(f => f.status === 'open' && f.severity === 'critical').length;
  const highCount = findings.filter(f => f.status === 'open' && f.severity === 'high').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Findings
            </CardTitle>
            <CardDescription>
              {openCount === 0 ? 'No open issues' : `${openCount} open issue${openCount > 1 ? 's' : ''}`}
              {criticalCount > 0 && ` (${criticalCount} critical)`}
              {highCount > 0 && criticalCount === 0 && ` (${highCount} high)`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge 
              variant={filter === 'all' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              All ({findings.length})
            </Badge>
            <Badge 
              variant={filter === 'open' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setFilter('open')}
            >
              Open ({openCount})
            </Badge>
            <Badge 
              variant={filter === 'resolved' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setFilter('resolved')}
            >
              Resolved ({findings.length - openCount})
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredFindings.map((finding) => {
              const severityConfig = getSeverityConfig(finding.severity);
              const categoryConfig = getCategoryConfig(finding.category);
              const isExpanded = expandedIds.has(finding.id);

              return (
                <Collapsible key={finding.id} open={isExpanded}>
                  <div className={`border-l-4 ${severityConfig.border} rounded-lg bg-muted/30`}>
                    <CollapsibleTrigger 
                      className="w-full"
                      onClick={() => toggleExpand(finding.id)}
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Badge className={severityConfig.color}>
                            {severityConfig.icon}
                            <span className="ml-1 capitalize">{finding.severity}</span>
                          </Badge>
                          <span className="font-medium text-sm">{finding.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            {categoryConfig.icon}
                            {categoryConfig.label}
                          </Badge>
                          {finding.status === 'resolved' && (
                            <Badge className="bg-success/20 text-success border-success/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                          {finding.status === 'ignored' && (
                            <Badge variant="outline">Ignored</Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-10 pb-4 space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                          <p className="text-sm">{finding.description}</p>
                        </div>
                        
                        {(finding.affectedTable || finding.affectedPolicy) && (
                          <div className="flex gap-4">
                            {finding.affectedTable && (
                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">Affected Table</div>
                                <code className="text-sm bg-muted px-2 py-1 rounded">{finding.affectedTable}</code>
                              </div>
                            )}
                            {finding.affectedPolicy && (
                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">Affected Policy</div>
                                <code className="text-sm bg-muted px-2 py-1 rounded">{finding.affectedPolicy}</code>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Remediation</div>
                          <div className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                            {finding.remediation}
                          </div>
                        </div>

                        {finding.status === 'open' && (
                          <div className="flex gap-2">
                            {onResolve && (
                              <Button size="sm" onClick={() => onResolve(finding.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Mark Resolved
                              </Button>
                            )}
                            {onIgnore && (
                              <Button size="sm" variant="outline" onClick={() => onIgnore(finding.id)}>
                                Ignore
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="gap-1">
                              <ExternalLink className="h-4 w-4" />
                              View Docs
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {filteredFindings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-success" />
                <p className="text-sm">
                  {filter === 'open' 
                    ? 'No open security issues' 
                    : filter === 'resolved' 
                    ? 'No resolved issues yet'
                    : 'No security findings'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SecurityFindingsCard;
