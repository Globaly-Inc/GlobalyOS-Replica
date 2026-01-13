import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackRouteChange } from '@/lib/errorCapture';

/**
 * Component that tracks route changes for error context breadcrumbs
 * Must be placed inside BrowserRouter to access location
 */
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackRouteChange(location.pathname + location.search);
  }, [location]);

  return null;
};

export default RouteTracker;
