import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, SortAsc, SortDesc } from 'lucide-react';

interface TestResultsFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: () => void;
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

const TestResultsFilter = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  counts,
}: TestResultsFilterProps) => {
  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by test name or file..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="unit">Unit</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="e2e">E2E</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <div className="flex gap-1">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onSortOrderChange}>
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Status Counts */}
      <div className="flex gap-2">
        <Badge 
          variant={statusFilter === 'all' ? 'default' : 'outline'} 
          className="cursor-pointer"
          onClick={() => onStatusFilterChange('all')}
        >
          All ({counts.total})
        </Badge>
        <Badge 
          variant={statusFilter === 'passed' ? 'default' : 'outline'} 
          className="cursor-pointer bg-success/10 text-success border-success/30 hover:bg-success/20"
          onClick={() => onStatusFilterChange('passed')}
        >
          Passed ({counts.passed})
        </Badge>
        <Badge 
          variant={statusFilter === 'failed' ? 'default' : 'outline'} 
          className="cursor-pointer bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
          onClick={() => onStatusFilterChange('failed')}
        >
          Failed ({counts.failed})
        </Badge>
        <Badge 
          variant={statusFilter === 'skipped' ? 'default' : 'outline'} 
          className="cursor-pointer bg-warning/10 text-warning border-warning/30 hover:bg-warning/20"
          onClick={() => onStatusFilterChange('skipped')}
        >
          Skipped ({counts.skipped})
        </Badge>
      </div>
    </div>
  );
};

export default TestResultsFilter;
