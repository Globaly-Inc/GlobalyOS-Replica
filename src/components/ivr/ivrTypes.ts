export type IvrNodeType = 'greeting' | 'menu' | 'voicemail' | 'forward' | 'message' | 'hangup' | 'queue';

export interface IvrMenuOption {
  digit: string;
  label: string;
  target_node_id: string;
}

export interface IvrNodePosition {
  x: number;
  y: number;
}

export interface IvrNode {
  id: string;
  type: IvrNodeType;
  label: string;
  position: IvrNodePosition;
  // Greeting / Message
  greeting_text?: string;
  // Menu
  menu_options?: IvrMenuOption[];
  timeout?: number;
  // Forward
  forward_number?: string;
  // Queue
  queue_id?: string;
  queue_name?: string;
  hold_music_url?: string;
  // Voicemail
  voicemail_max_length?: number;
  voicemail_prompt?: string;
  // Children (non-menu nodes)
  children?: string[];
}

export interface IvrTreeConfig {
  nodes: IvrNode[];
  business_hours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
    after_hours_greeting: string;
  };
  voicemail_enabled?: boolean;
}

// Old flat config format for migration
export interface LegacyIvrConfig {
  greeting?: string;
  menu_options?: { digit: string; label: string; action: string; message?: string }[];
  voicemail_enabled?: boolean;
  business_hours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
    after_hours_greeting: string;
  };
}

export const NODE_COLORS: Record<IvrNodeType, { bg: string; border: string; icon: string }> = {
  greeting: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', icon: 'text-blue-600 dark:text-blue-400' },
  menu: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-300 dark:border-teal-700', icon: 'text-teal-600 dark:text-teal-400' },
  forward: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-700', icon: 'text-green-600 dark:text-green-400' },
  queue: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-300 dark:border-cyan-700', icon: 'text-cyan-600 dark:text-cyan-400' },
  voicemail: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', icon: 'text-orange-600 dark:text-orange-400' },
  message: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', icon: 'text-purple-600 dark:text-purple-400' },
  hangup: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-300 dark:border-red-700', icon: 'text-red-600 dark:text-red-400' },
};

export const NODE_LABELS: Record<IvrNodeType, string> = {
  greeting: 'Greeting',
  menu: 'Menu',
  forward: 'Forward',
  queue: 'Queue',
  voicemail: 'Voicemail',
  message: 'Message',
  hangup: 'Hang Up',
};
