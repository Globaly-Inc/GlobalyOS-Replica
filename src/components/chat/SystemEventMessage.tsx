import { UserPlus, UserMinus, LogOut, Crown, ShieldOff, Pencil, Camera, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { SystemEventData } from "@/types/chat";

interface SystemEventMessageProps {
  eventData: SystemEventData;
  timestamp: string;
}

const getSyncReasonLabel = (reason?: string): string => {
  switch (reason) {
    case 'office': return 'office';
    case 'department': return 'department';
    case 'project': return 'project';
    case 'company': return 'company-wide access';
    default: return 'access groups';
  }
};

const getAddedText = (data: SystemEventData): string => {
  const baseName = data.target_name;
  
  if (data.source === 'auto_sync') {
    const reasonLabel = getSyncReasonLabel(data.sync_reason);
    if (data.access_group_name) {
      return `${baseName} was added by auto-sync (${reasonLabel}: ${data.access_group_name})`;
    }
    return `${baseName} was added by auto-sync on ${reasonLabel}`;
  }
  
  if (data.source === 'space_creation') {
    return `${baseName} was added when the space was created`;
  }
  
  if (data.actor_name) {
    return `${baseName} was invited by ${data.actor_name}`;
  }
  
  return `${baseName} was added`;
};

const getRemovedText = (data: SystemEventData): string => {
  const baseName = data.target_name;
  
  if (data.source === 'auto_sync') {
    const reasonLabel = getSyncReasonLabel(data.sync_reason);
    if (data.access_group_name) {
      return `${baseName} was removed by auto-sync (no longer in ${reasonLabel}: ${data.access_group_name})`;
    }
    return `${baseName} was removed by auto-sync (no longer matches ${reasonLabel})`;
  }
  
  if (data.actor_name) {
    return `${baseName} was removed by ${data.actor_name}`;
  }
  
  return `${baseName} was removed`;
};

const eventConfig = {
  member_added: {
    icon: UserPlus,
    getText: getAddedText,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  member_removed: {
    icon: UserMinus,
    getText: getRemovedText,
    className: "text-destructive",
  },
  member_left: {
    icon: LogOut,
    getText: (data: SystemEventData) => 
      `${data.target_name} left the space`,
    className: "text-muted-foreground",
  },
  admin_added: {
    icon: Crown,
    getText: (data: SystemEventData) => 
      data.actor_name 
        ? `${data.target_name} was made an admin by ${data.actor_name}`
        : `${data.target_name} was made an admin`,
    className: "text-amber-600 dark:text-amber-400",
  },
  admin_removed: {
    icon: ShieldOff,
    getText: (data: SystemEventData) => 
      data.actor_name 
        ? `${data.target_name} is no longer an admin (changed by ${data.actor_name})`
        : `${data.target_name} is no longer an admin`,
    className: "text-muted-foreground",
  },
  group_name_changed: {
    icon: Pencil,
    getText: (data: SystemEventData) => 
      data.old_value 
        ? `${data.actor_name} changed the group name from "${data.old_value}" to "${data.new_value}"`
        : `${data.actor_name} changed the group name to "${data.new_value}"`,
    className: "text-blue-600 dark:text-blue-400",
  },
  group_photo_changed: {
    icon: Camera,
    getText: (data: SystemEventData) => 
      `${data.actor_name} updated the group photo`,
    className: "text-blue-600 dark:text-blue-400",
  },
  space_name_changed: {
    icon: Pencil,
    getText: (data: SystemEventData) => 
      data.old_value 
        ? `${data.actor_name} changed the space name from "${data.old_value}" to "${data.new_value}"`
        : `${data.actor_name} changed the space name to "${data.new_value}"`,
    className: "text-blue-600 dark:text-blue-400",
  },
  space_photo_changed: {
    icon: Camera,
    getText: (data: SystemEventData) => 
      `${data.actor_name} updated the space photo`,
    className: "text-blue-600 dark:text-blue-400",
  },
};

const SystemEventMessage = ({ eventData, timestamp }: SystemEventMessageProps) => {
  const config = eventConfig[eventData.event_type];
  
  if (!config) return null;

  const Icon = config.icon;
  const text = config.getText(eventData);
  const time = format(new Date(timestamp), "h:mm a");
  
  // Use sync icon for auto-sync events
  const isAutoSync = eventData.source === 'auto_sync';
  const DisplayIcon = isAutoSync ? RefreshCw : Icon;

  return (
    <div className="flex items-center justify-start py-2 px-4">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
        <DisplayIcon className={cn("h-3.5 w-3.5", config.className)} />
        <span className="text-muted-foreground">
          {text} <span className="text-muted-foreground/60 ml-1">{time}</span>
        </span>
      </div>
    </div>
  );
};

export default SystemEventMessage;
