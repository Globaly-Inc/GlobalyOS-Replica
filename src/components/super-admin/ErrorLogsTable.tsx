import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react';
import { useAllErrorLogs, useUpdateErrorLogStatus, useBulkUpdateErrorLogStatus, useErrorLogsRealtime } from '@/services/useErrorLogs';
import type { ErrorLogFilters, ErrorLogStatus, ErrorSeverity, ErrorType } from '@/types/errorLogs';
import { toast } from 'sonner';

const severityConfig: Record<ErrorSeverity, { label: string; icon: React.ElementType; className: string }> = {
  critical: { label: 'Critical', icon: AlertCircle, className: 'bg-destructive text-destructive-foreground' },
  error: { label: 'Error', icon: AlertTriangle, className: 'bg-orange-500 text-white' },
  warning: { label: 'Warning', icon: Info, className: 'bg-yellow-500 text-black' },
};

const statusConfig: Record<ErrorLogStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  investigating: { label: 'Investigating', className: 'bg-purple-100 text-purple-800' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  ignored: { label: 'Ignored', className: 'bg-gray-100 text-gray-800' },
};

const ErrorLogsTable = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ErrorLogFilters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: logs, isLoading } = useAllErrorLogs(filters);
  const updateStatus = useUpdateErrorLogStatus();
  const bulkUpdateStatus = useBulkUpdateErrorLogStatus();
  
  // Enable realtime updates
  useErrorLogsRealtime();

  const handleFilterChange = (key: keyof ErrorLogFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(logs?.map(l => l.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkAction = async (status: ErrorLogStatus) => {
    if (selectedIds.length === 0) return;
    
    try {
      await bulkUpdateStatus.mutateAsync({ ids: selectedIds, status });
      toast.success(`${selectedIds.length} errors marked as ${status}`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to update errors');
    }
  };

  const handleStatusChange = async (id: string, status: ErrorLogStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Error marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search error messages..."
                className="pl-10"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              />
            </div>
            
            <Select
              value={filters.errorType || 'all'}
              onValueChange={(v) => handleFilterChange('errorType', v as ErrorType)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Error Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="runtime">Runtime</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="edge_function">Edge Function</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.severity || 'all'}
              onValueChange={(v) => handleFilterChange('severity', v as ErrorSeverity)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v as ErrorLogStatus)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('resolved')}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark Resolved
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('ignored')}>
            <XCircle className="h-4 w-4 mr-1" />
            Mark Ignored
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === logs?.length && logs.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="max-w-[300px]">Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No errors found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => {
                    const severity = severityConfig[log.severity];
                    const status = statusConfig[log.status];
                    const SeverityIcon = severity.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(log.id)}
                            onCheckedChange={(c) => handleSelect(log.id, !!c)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={log.profiles?.avatar_url || undefined} 
                                alt={log.profiles?.full_name || 'User'} 
                              />
                              <AvatarFallback className="text-xs">
                                {log.profiles?.full_name
                                  ? log.profiles.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                  : 'AN'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">
                                {log.profiles?.full_name || 'Anonymous'}
                              </div>
                              {log.profiles?.email && (
                                <div className="text-xs text-muted-foreground">
                                  {log.profiles.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.organizations?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.error_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={severity.className}>
                            <SeverityIcon className="h-3 w-3 mr-1" />
                            {severity.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm truncate" title={log.error_message}>
                            {log.error_message}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.className} variant="secondary">
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/super-admin/error-logs/${log.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(log.id, 'investigating')}>
                                Investigating
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(log.id, 'resolved')}>
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(log.id, 'ignored')}>
                                Mark Ignored
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorLogsTable;
