import { Users, MessageSquare, BookOpen, CheckSquare, Briefcase } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

interface TopNavProps {
  isAdmin: boolean;
}

const mainNavItems = [
  { name: "Team", href: "/", icon: Users, adminOnly: false },
  { name: "Chat", href: "/chat", icon: MessageSquare, adminOnly: true, isStatic: true },
  { name: "Wiki", href: "/wiki", icon: BookOpen, adminOnly: false },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, adminOnly: true, isStatic: true },
  { name: "CRM", href: "/crm", icon: Briefcase, adminOnly: true, isStatic: true },
];

export const TopNav = ({ isAdmin }: TopNavProps) => {
  const visibleItems = mainNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="flex items-center space-x-1">
      {visibleItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            item.isStatic && "opacity-70"
          )}
          activeClassName="bg-secondary text-foreground"
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </NavLink>
      ))}
    </nav>
  );
};

export { mainNavItems };
