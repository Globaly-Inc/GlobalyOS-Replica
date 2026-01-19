/**
 * Leave Types Customizer for Onboarding
 * Compact checkbox list layout with enable/disable capability
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_LEAVE_TYPES } from '@/constants/defaultLeaveTypes';

export interface LeaveTypeConfig {
  name: string;
  category: 'paid' | 'unpaid';
  default_days: number;
  is_custom?: boolean;
  is_enabled: boolean;
}

interface LeaveTypesCustomizerProps {
  value: LeaveTypeConfig[];
  onChange: (config: LeaveTypeConfig[]) => void;
  disabled?: boolean;
}

const MAX_CUSTOM_TYPES = 3;

export function LeaveTypesCustomizer({ value, onChange, disabled = false }: LeaveTypesCustomizerProps) {

  // Initialize with defaults if empty
  const leaveTypes: LeaveTypeConfig[] = value.length > 0 ? value : getDefaultLeaveTypesConfig();

  const systemTypes = leaveTypes.filter(lt => !lt.is_custom);
  const customTypes = leaveTypes.filter(lt => lt.is_custom);
  const canAddMore = customTypes.length < MAX_CUSTOM_TYPES;

  const updateLeaveType = (globalIndex: number, updates: Partial<LeaveTypeConfig>) => {
    const updated = [...leaveTypes];
    updated[globalIndex] = { ...updated[globalIndex], ...updates };
    onChange(updated);
  };

  const toggleEnabled = (globalIndex: number, enabled: boolean) => {
    updateLeaveType(globalIndex, { is_enabled: enabled });
  };

  const updateDays = (globalIndex: number, days: number) => {
    updateLeaveType(globalIndex, { default_days: Math.max(0, days) });
  };

  const addCustomType = () => {
    if (!canAddMore) return;
    const newType: LeaveTypeConfig = {
      name: '',
      category: 'paid',
      default_days: 0,
      is_custom: true,
      is_enabled: true,
    };
    onChange([...leaveTypes, newType]);
  };

  const removeCustomType = (globalIndex: number) => {
    onChange(leaveTypes.filter((_, i) => i !== globalIndex));
  };

  const updateCustomName = (globalIndex: number, name: string) => {
    updateLeaveType(globalIndex, { name });
  };

  const updateCustomCategory = (globalIndex: number, category: 'paid' | 'unpaid') => {
    updateLeaveType(globalIndex, { category });
  };

  const enabledCount = leaveTypes.filter(lt => lt.is_enabled).length;

  // Prevent Enter key from submitting parent form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="space-y-2">

        {/* System Leave Types */}
        <div className="space-y-1">
          {systemTypes.map((lt) => {
            const globalIndex = leaveTypes.indexOf(lt);
            return (
              <div
                key={globalIndex}
                className={cn(
                  "flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors",
                  lt.is_enabled ? "hover:bg-muted/50" : "opacity-60"
                )}
              >
                <Checkbox
                  checked={lt.is_enabled}
                  onCheckedChange={(checked) => toggleEnabled(globalIndex, !!checked)}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span className={cn(
                  "flex-1 text-sm",
                  !lt.is_enabled && "text-muted-foreground"
                )}>
                  {lt.name}
                </span>
                <Badge 
                  variant={lt.category === 'paid' ? 'default' : 'secondary'} 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5",
                    lt.category === 'paid' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {lt.category}
                </Badge>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={lt.default_days}
                    onChange={(e) => updateDays(globalIndex, parseInt(e.target.value) || 0)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || !lt.is_enabled}
                    className="w-14 h-7 text-center text-sm px-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-8">days</span>
                </div>
              </div>
            );
          })}
        </div>

    </div>
  );
}

// Export function to get default config
export function getDefaultLeaveTypesConfig(): LeaveTypeConfig[] {
  return DEFAULT_LEAVE_TYPES.map(lt => ({
    name: lt.name,
    category: lt.category,
    default_days: lt.default_days,
    is_custom: false,
    is_enabled: true,
  }));
}
