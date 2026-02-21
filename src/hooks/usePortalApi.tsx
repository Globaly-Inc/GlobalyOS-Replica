import { useCallback } from 'react';
import { usePortalAuth } from './usePortalAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const usePortalApi = () => {
  const { token } = usePortalAuth();

  const portalFetch = useCallback(async (action: string, params?: Record<string, string>, body?: any) => {
    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${SUPABASE_URL}/functions/v1/portal-api?${queryParams}`;
    
    const options: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'x-portal-token': token || '',
      },
    };

    if (body) {
      options.method = 'POST';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }, [token]);

  return { portalFetch };
};
