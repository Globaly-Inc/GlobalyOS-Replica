/**
 * Leave Types Customizer for Onboarding
 * Allows customizing default days for system leave types
 */

import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Settings2, Plus, Trash2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DEFAULT_LEAVE_TYPES, type DefaultLeaveType } from '@/constants/defaultLeaveTypes';

export interface LeaveTypeConfig {
  name: string;
  category: 'paid' | 'unpaid';
  default_days: number;
  is_custom?: boolean;
}

interface LeaveTypesCustomizerProps {
  value: LeaveTypeConfig[];
  onChange: (config: LeaveTypeConfig[]) => void;
  disabled?: boolean;
}

export function LeaveTypesCustomizer({ value, onChange, disabled = false }: LeaveTypesCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with defaults if empty
  const leaveTypes = value.length > 0 ? value : DEFAULT_LEAVE_TYPES.map(lt => ({
    name: lt.name,
    category: lt.category,
    default_days: lt.default_days,
    is_custom: false,
  }));

  const updateDays = (index: number, days: number) => {
    const updated = [...leaveTypes];
    updated[index] = { ...updated[index], default_days: Math.max(0, days) };
    onChange(updated);
  };

  const addCustomType = () => {
    const customCount = leaveTypes.filter(lt => lt.is_custom).length;
    onChange([
      ...leaveTypes,
      {
        name: `Custom Leave ${customCount + 1}`,
        category: 'paid',
        default_days: 0,
        is_custom: true,
      },
    ]);
  };

  const removeCustomType = (index: number) => {
    onChange(leaveTypes.filter((_, i) => i !== index));
  };

  const updateCustomName = (index: number, name: string) => {
    const updated = [...leaveTypes];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const customTypesCount = leaveTypes.filter(lt => lt.is_custom).length;
  const canAddMore = customTypesCount < 3;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50 border border-dashed rounded-lg"
          disabled={disabled}
        >
          <span className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Customize Leave Types</span>
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            Adjust the default yearly allowance for each leave type. These balances will be allocated to all employees.
          </p>

          <div className="overflow-x-auto rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[180px]">Leave Type</TableHead>
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center gap-1">
                      Days/Year
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Default yearly balance allocated to employees
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((lt, index) => (
                  <TableRow 
                    key={index}
                    className={cn(lt.is_custom && "bg-blue-50/50 dark:bg-blue-950/20")}
                  >
                    <TableCell className="p-2">
                      {lt.is_custom ? (
                        <Input
                          value={lt.name}
                          onChange={(e) => updateCustomName(index, e.target.value)}
                          placeholder="Leave type name"
                          className="h-8 text-sm"
                          disabled={disabled}
                        />
                      ) : (
                        <span className="text-sm font-medium">{lt.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <Badge 
                        variant={lt.category === 'paid' ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs capitalize',
                          lt.category === 'paid' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        {lt.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        min={0}
                        max={365}
                        value={lt.default_days}
                        onChange={(e) => updateDays(index, parseInt(e.target.value) || 0)}
                        className="h-8 w-20 text-sm text-center"
                        disabled={disabled}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      {lt.is_custom && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomType(index)}
                          disabled={disabled}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {canAddMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomType}
              disabled={disabled}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Leave Type
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            You can add more leave types and configure detailed settings after setup.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Export function to get default config
export function getDefaultLeaveTypesConfig(): LeaveTypeConfig[] {
  return DEFAULT_LEAVE_TYPES.map(lt => ({
    name: lt.name,
    category: lt.category,
    default_days: lt.default_days,
    is_custom: false,
  }));
}
