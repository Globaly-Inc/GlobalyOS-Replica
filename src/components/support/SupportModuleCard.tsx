/**
 * Support Module Card Component
 * Displays a module card with icon and description
 */

import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, Calendar, Clock, CalendarDays, Target, Star, 
  BookOpen, MessageSquare, CheckSquare, Briefcase, DollarSign, 
  Settings, Info, LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupportModuleCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  articleCount?: number;
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Info,
  Users,
  Calendar,
  Clock,
  CalendarDays,
  Target,
  Star,
  BookOpen,
  MessageSquare,
  CheckSquare,
  Briefcase,
  DollarSign,
  Settings,
};

export const SupportModuleCard = ({ 
  id, 
  name, 
  description, 
  icon, 
  articleCount,
  className 
}: SupportModuleCardProps) => {
  const Icon = ICON_MAP[icon] || Info;

  return (
    <Link to={`/support/features/${id}`}>
      <Card className={cn(
        "h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group",
        className
      )}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium">{name}</CardTitle>
              <CardDescription className="text-xs line-clamp-1">{description}</CardDescription>
              {articleCount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {articleCount} {articleCount === 1 ? 'article' : 'articles'}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
};
