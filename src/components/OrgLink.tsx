/**
 * Organization-scoped Link component
 * Automatically prepends organization code (slug) to link paths
 */

import { forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';

export interface OrgLinkProps extends Omit<LinkProps, 'to'> {
  /** Path relative to organization (e.g., '/team' becomes '/org/:orgCode/team') */
  to: string;
  /** If true, don't prepend org prefix */
  absolute?: boolean;
}

export const OrgLink = forwardRef<HTMLAnchorElement, OrgLinkProps>(
  ({ to, absolute = false, ...props }, ref) => {
    const { buildOrgPath } = useOrgNavigation();
    
    const href = absolute ? to : buildOrgPath(to);
    
    return <Link ref={ref} to={href} {...props} />;
  }
);

OrgLink.displayName = 'OrgLink';

export default OrgLink;
