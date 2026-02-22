import { useAgentAuth } from './useAgentAuth';
import { useCallback } from 'react';

export const useAgentApi = () => {
  const { token } = useAgentAuth();

  const agentFetch = useCallback(async (action: string, options?: {
    method?: string;
    body?: any;
    params?: Record<string, string>;
  }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const params = new URLSearchParams({ action, ...options?.params });
    const url = `${supabaseUrl}/functions/v1/agent-api?${params}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['x-agent-token'] = token;

    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);

  return { agentFetch };
};
