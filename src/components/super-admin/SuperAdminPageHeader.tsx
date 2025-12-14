import { ReactNode } from "react";

interface SuperAdminPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

const SuperAdminPageHeader = ({ title, description, actions }: SuperAdminPageHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default SuperAdminPageHeader;
