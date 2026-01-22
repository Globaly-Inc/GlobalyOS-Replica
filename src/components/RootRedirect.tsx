/**
 * Root path component
 * Shows Landing page for unauthenticated users
 * Shows Mobile Intro for first-time iOS native app users
 * Redirects authenticated users to their organization (onboarding guard handles the rest)
 */

import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import Landing from '@/pages/Landing';
import MobileAppIntro from '@/components/MobileAppIntro';

// Check if running as iOS native app (Capacitor or standalone PWA)
const isIOSNativeApp = (): boolean => {
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
  const isStandalone = (window.navigator as any).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isIOS && (isCapacitor || isStandalone);
};

const RootRedirect = () => {
  const { session, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrganization();
  const [showMobileIntro, setShowMobileIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // Check if we should show mobile intro on mount
  useEffect(() => {
    if (!authLoading && !session) {
      const hasSeenIntro = localStorage.getItem('hasSeenMobileIntro') === 'true';
      const shouldShowIntro = isIOSNativeApp() && !hasSeenIntro;
      setShowMobileIntro(shouldShowIntro);
    }
    setIntroChecked(true);
  }, [authLoading, session]);

  // Handle intro completion
  const handleIntroComplete = () => {
    setShowMobileIntro(false);
  };
  
  // Still loading
  if (authLoading || orgLoading || !introChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show mobile intro for first-time iOS users
  if (showMobileIntro && !session) {
    return <MobileAppIntro onComplete={handleIntroComplete} />;
  }
  
  // Authenticated with org - redirect to org home (onboarding guard in OrgProtectedRoute handles the rest)
  if (session && currentOrg) {
    return <Navigate to={`/org/${currentOrg.slug}`} replace />;
  }
  
  // Not authenticated - show landing
  return <Landing />;
};

export default RootRedirect;
