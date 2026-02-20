 import { Building2, Briefcase, Target, ClipboardCheck, Sparkles, CreditCard, Settings, Users } from 'lucide-react';
 import { OrgLink } from './OrgLink';
 import { useLocation, useParams } from 'react-router-dom';
 import { cn } from '@/lib/utils';
 import { useFeatureFlags, FeatureName } from '@/hooks/useFeatureFlags';
 
 interface SettingsNavItem {
   name: string;
   href: string;
   icon: React.ComponentType<{ className?: string }>;
   featureFlag?: FeatureName;
   end?: boolean;
 }
 
 const settingsSubNavItems: SettingsNavItem[] = [
   { name: 'Organization', href: '/settings', icon: Building2, end: true },
   { name: 'Offices', href: '/settings/offices', icon: Building2 },
   { name: 'Projects', href: '/settings/projects', icon: Briefcase },
   { name: 'KPIs', href: '/settings/kpis', icon: Target },
   { name: 'Workflows', href: '/settings/workflows', icon: ClipboardCheck, featureFlag: 'workflows' },
   { name: 'CRM', href: '/settings/crm', icon: Users, featureFlag: 'crm' },
   { name: 'AI', href: '/settings/ai', icon: Sparkles, featureFlag: 'ask-ai' },
   { name: 'Billing', href: '/settings/billing', icon: CreditCard },
 ];
 
 export const SettingsSubNav = () => {
   const location = useLocation();
   const { orgCode } = useParams<{ orgCode: string }>();
   const { isEnabled } = useFeatureFlags();
   
   const basePath = orgCode ? `/org/${orgCode}` : '';
   
   // Filter items based on feature flags
   const visibleItems = settingsSubNavItems.filter(item => {
     if (item.featureFlag && !isEnabled(item.featureFlag)) return false;
     return true;
   });
   
   // Show sub-nav only on settings pages
   const isSettingsSection = location.pathname.startsWith(`${basePath}/settings`);
 
   if (!isSettingsSection) return null;
 
   return (
     <div className="hidden md:block sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
       <div className="container px-4 md:px-8">
         <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
           {/* Settings icon indicator */}
           <div className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-muted-foreground">
             <Settings className="h-4 w-4" />
           </div>
           
           {visibleItems.map((item) => {
             const fullPath = `${basePath}${item.href}`;
             
             const isActive = item.end
               ? location.pathname === fullPath
               : location.pathname === fullPath || 
                 location.pathname.startsWith(`${fullPath}/`);
             
             return (
               <OrgLink
                 key={item.name}
                 to={item.href}
                 className={cn(
                   'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent whitespace-nowrap',
                   'text-muted-foreground hover:text-foreground hover:border-border',
                   isActive && 'text-foreground border-primary'
                 )}
               >
                 <item.icon className="h-4 w-4" />
                 {item.name}
               </OrgLink>
             );
           })}
         </nav>
       </div>
     </div>
   );
 };