/**
 * Hook for organization-scoped navigation
 * Provides utilities to navigate within the current organization context
 * Uses orgCode (slug) instead of orgId in URLs for security-by-obfuscation
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useOrganization } from './useOrganization';

export interface OrgNavigationResult {
  /** Current organization code from URL params */
  orgCode: string | undefined;
  /** Current organization ID (resolved from code) */
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
  '/',
  '/auth',
  '/signup',
  '/join',
  '/install',
];

export const useOrgNavigation = (): OrgNavigationResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ orgCode?: string }>();
  const { currentOrg } = useOrganization();

  const isOrgRoute = useMemo(() => {
    return !PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  // Get orgCode from URL params or current org's slug
  const orgCode = params.orgCode || currentOrg?.slug;
  
  // Get orgId from current org (resolved server-side)
  const orgId = currentOrg?.id;

  const buildOrgPath = useCallback((path: string): string => {
    if (!orgCode) {
      console.warn('No organization code available for org-scoped navigation');
      return path;
    }
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // Don't double-prefix if already org-scoped
    if (normalizedPath.startsWith(`/org/${orgCode}`)) {
      return normalizedPath;
    }
    return `/org/${orgCode}${normalizedPath}`;
  }, [orgCode]);

  const navigateOrg = useCallback((path: string, options?: { replace?: boolean }) => {
    const orgPath = buildOrgPath(path);
    navigate(orgPath, options);
  }, [navigate, buildOrgPath]);

  return {
    orgCode,
    orgId,
    navigateOrg,
    buildOrgPath,
    isOrgRoute,
  };
};

/**
 * Helper to extract organization code from a path
 */
export const extractOrgCodeFromPath = (path: string): string | null => {
  const match = path.match(/^\/org\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
};

/**
 * Helper to strip org prefix from a path
 */
export const stripOrgPrefix = (path: string): string => {
  return path.replace(/^\/org\/[a-zA-Z0-9_-]+/i, '') || '/';
};
