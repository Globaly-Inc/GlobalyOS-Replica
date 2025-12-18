import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

const detectDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
};

export const usePageVisitTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const lastPathRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Debounce to avoid duplicate entries on quick navigation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Skip if same path (prevents duplicate logging)
    if (lastPathRef.current === location.pathname) return;

    debounceRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase.from('user_page_visits').insert({
          user_id: user.id,
          page_path: location.pathname,
          page_title: document.title || location.pathname,
          browser_info: getBrowserInfo(),
          device_type: detectDeviceType(),
          organization_id: currentOrg?.id || null,
        });

        if (error) {
          // Silently fail - don't interrupt user experience
          console.debug('Page visit tracking error:', error.message);
        } else {
          lastPathRef.current = location.pathname;
        }
      } catch (err) {
        console.debug('Page visit tracking error:', err);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [location.pathname, user?.id, currentOrg?.id]);
};
