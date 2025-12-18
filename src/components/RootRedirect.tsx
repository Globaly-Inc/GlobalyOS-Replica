/**
 * Root path component
 * Shows Landing page for all users
 * Authenticated users see "Go to Dashboard" button on Landing page
 */

import Landing from '@/pages/Landing';

const RootRedirect = () => {
  return <Landing />;
};

export default RootRedirect;
