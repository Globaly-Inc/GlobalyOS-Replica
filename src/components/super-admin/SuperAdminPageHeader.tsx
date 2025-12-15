import { ReactNode } from "react";

export interface SuperAdminPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}

const SuperAdminPageHeader = ({ title, description, actions, className }: SuperAdminPageHeaderProps) => {
  return (
    <div className={`flex items-center justify-between ${className ?? ''}`}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default SuperAdminPageHeader;
