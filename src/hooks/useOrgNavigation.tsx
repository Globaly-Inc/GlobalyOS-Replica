/**
 * Hook for organization-scoped navigation
 * Provides utilities to navigate within the current organization context
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useOrganization } from './useOrganization';

export interface OrgNavigationResult {
  /** Current organization ID from URL params */
  orgId: string | undefined;
  /** Navigate to an org-scoped path */
  navigateOrg: (path: string, options?: { replace?: boolean }) => void;
  /** Build an org-scoped URL path */
  buildOrgPath: (path: string) => string;
  /** Check if currently on an org-scoped route */
  isOrgRoute: boolean;
}

/**
 * Routes that don't require organization context
 */
const PUBLIC_ROUTES = [
  '/landing',
  '/auth',
  '/signup',
  '/join',
  '/install',
];

export const useOrgNavigation = (): OrgNavigationResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ orgId?: string }>();
  const { currentOrg } = useOrganization();

  const isOrgRoute = useMemo(() => {
    return !PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  const orgId = params.orgId || currentOrg?.id;

  const buildOrgPath = useCallback((path: string): string => {
    if (!orgId) {
      console.warn('No organization ID available for org-scoped navigation');
      return path;
    }
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // Don't double-prefix if already org-scoped
    if (normalizedPath.startsWith(`/org/${orgId}`)) {
      return normalizedPath;
    }
    return `/org/${orgId}${normalizedPath}`;
  }, [orgId]);

  const navigateOrg = useCallback((path: string, options?: { replace?: boolean }) => {
    const orgPath = buildOrgPath(path);
    navigate(orgPath, options);
  }, [navigate, buildOrgPath]);

  return {
    orgId,
    navigateOrg,
    buildOrgPath,
    isOrgRoute,
  };
};

/**
 * Helper to extract organization ID from a path
 */
export const extractOrgIdFromPath = (path: string): string | null => {
  const match = path.match(/^\/org\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
};

/**
 * Helper to strip org prefix from a path
 */
export const stripOrgPrefix = (path: string): string => {
  return path.replace(/^\/org\/[a-f0-9-]+/i, '') || '/';
};
