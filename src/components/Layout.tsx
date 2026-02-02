import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import globalyosLogo from "@/assets/globalyos-icon.png";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { MobileBottomNav } from "./MobileBottomNav";
import { TopNav } from "./TopNav";
import { SubNav } from "./SubNav";

import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";
import TrialBanner from "./TrialBanner";
import { SpotlightTour } from "./SpotlightTour";
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { usePageVisitTracking } from "@/hooks/usePageVisitTracking";
import { KpiGenerationProgress } from "./kpi/KpiGenerationProgress";
import { useLayoutState } from '@/hooks/useLayoutState';
import { DesktopQuickActions } from './layout/DesktopQuickActions';
import { MobileHeaderActions } from './layout/MobileHeaderActions';
import { LayoutDialogs } from './layout/LayoutDialogs';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { navigateOrg } = useOrgNavigation();
  
  // Track page visits for Super Admin analytics
  usePageVisitTracking();
  
  // Detect full-height pages
  const isFullHeightPage = location.pathname.includes('/wiki') || location.pathname.includes('/chat');
  
  // Layout state hook - handles all the complex state management
  const {
    user,
    signOut,
    currentOrg,
    userProfile,
    unreadCount,
    elapsedTime,
    isOnline,
    shouldUseRemoteCheckIn,
    fetchTodayAttendance,
  } = useLayoutState();

  // Dialog states
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [remoteCheckInOpen, setRemoteCheckInOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [getHelpDialogOpen, setGetHelpDialogOpen] = useState(false);


  // Re-fetch attendance when QR scanner closes
  useEffect(() => {
    if (!qrScannerOpen) {
      fetchTodayAttendance();
    }
  }, [qrScannerOpen, fetchTodayAttendance]);

  // Pull to refresh for mobile
  const { pullDistance, isRefreshing, isPastThreshold } = usePullToRefresh();

  const handleCheckIn = () => {
    if (shouldUseRemoteCheckIn) {
      setRemoteCheckInOpen(true);
    } else {
      setQrScannerOpen(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleViewProfile = () => {
    if (userProfile?.employeeId) {
      navigateOrg(`/team/${userProfile.employeeId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Spotlight Tour for Onboarding */}
      <SpotlightTour />
      
      {/* Pull to Refresh Indicator for Mobile */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isPastThreshold={isPastThreshold}
      />
      
      {/* Trial Banner */}
      <TrialBanner />
      
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 safe-area-top">
        <div className="container flex h-14 md:h-16 items-center px-3 md:px-8">
          <div className="mr-4 hidden md:flex items-center">
            <button 
              onClick={() => navigate("/")}
              className="hover:opacity-90 transition-opacity"
            >
              <img src={globalyosLogo} alt="GlobalyOS" className="h-9 w-9 rounded-lg" />
            </button>
          </div>

          {(userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
            <div className="hidden md:block mr-4">
              <OrganizationSwitcher />
            </div>
          )}
          
          <div className="hidden md:flex md:flex-1 md:items-center">
            <TopNav isAdmin={userProfile?.role === 'owner' || userProfile?.role === 'admin'} />
          </div>

          {/* Desktop Quick Actions */}
          <DesktopQuickActions
            userProfile={userProfile}
            elapsedTime={elapsedTime}
            unreadCount={unreadCount}
            isOnline={isOnline}
            currentOrgId={currentOrg?.id}
            shouldUseRemoteCheckIn={shouldUseRemoteCheckIn}
            onCheckIn={handleCheckIn}
            onLeaveRequest={() => setLeaveDialogOpen(true)}
            onSearch={() => setGlobalSearchOpen(true)}
            onViewProfile={handleViewProfile}
            onSignOut={handleSignOut}
          />

          {/* Mobile Header Actions */}
          <MobileHeaderActions
            elapsedTime={elapsedTime}
            unreadCount={unreadCount}
            onSearch={() => setMobileSearchOpen(true)}
            onGetHelp={() => setGetHelpDialogOpen(true)}
          />
        </div>
      </header>

      {/* Sub Navigation for Team section (includes Hiring) */}
      <SubNav />
      

      {/* Page Content */}
      <main className={`container px-4 md:px-8 ${isFullHeightPage ? 'h-[calc(100vh-4rem)] overflow-hidden pt-0 pb-0' : 'pt-2 pb-24 md:pb-8 overflow-x-hidden'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userProfile={userProfile} isOnline={isOnline} />

      {/* All Dialogs */}
      <LayoutDialogs
        userProfile={userProfile}
        qrScannerOpen={qrScannerOpen}
        setQrScannerOpen={setQrScannerOpen}
        leaveDialogOpen={leaveDialogOpen}
        setLeaveDialogOpen={setLeaveDialogOpen}
        postDialogOpen={postDialogOpen}
        setPostDialogOpen={setPostDialogOpen}
        remoteCheckInOpen={remoteCheckInOpen}
        setRemoteCheckInOpen={setRemoteCheckInOpen}
        globalSearchOpen={globalSearchOpen}
        setGlobalSearchOpen={setGlobalSearchOpen}
        getHelpDialogOpen={getHelpDialogOpen}
        setGetHelpDialogOpen={setGetHelpDialogOpen}
        mobileSearchOpen={mobileSearchOpen}
        setMobileSearchOpen={setMobileSearchOpen}
      />

      {/* KPI Generation Progress Indicator */}
      <KpiGenerationProgress organizationId={currentOrg?.id} />
    </div>
  );
};
