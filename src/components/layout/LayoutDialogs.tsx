import { QRScannerDialog } from "@/components/dialogs/QRScannerDialog";
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { RemoteCheckInDialog } from "@/components/dialogs/RemoteCheckInDialog";
import { GlobalSearch } from "@/components/GlobalSearch";
import { GetHelpDialog } from "@/components/dialogs/GetHelpDialog";
import { MobileSearch } from "@/components/MobileSearch";
import type { UserProfile } from '@/hooks/useLayoutState';

interface LayoutDialogsProps {
  userProfile: UserProfile | null;
  qrScannerOpen: boolean;
  setQrScannerOpen: (open: boolean) => void;
  leaveDialogOpen: boolean;
  setLeaveDialogOpen: (open: boolean) => void;
  postDialogOpen: boolean;
  setPostDialogOpen: (open: boolean) => void;
  remoteCheckInOpen: boolean;
  setRemoteCheckInOpen: (open: boolean) => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  getHelpDialogOpen: boolean;
  setGetHelpDialogOpen: (open: boolean) => void;
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (open: boolean) => void;
}

export const LayoutDialogs = ({
  userProfile,
  qrScannerOpen,
  setQrScannerOpen,
  leaveDialogOpen,
  setLeaveDialogOpen,
  postDialogOpen,
  setPostDialogOpen,
  remoteCheckInOpen,
  setRemoteCheckInOpen,
  globalSearchOpen,
  setGlobalSearchOpen,
  getHelpDialogOpen,
  setGetHelpDialogOpen,
  mobileSearchOpen,
  setMobileSearchOpen,
}: LayoutDialogsProps) => {
  return (
    <>
      {/* Mobile Search */}
      <MobileSearch open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />

      {userProfile?.employeeId && (
        <>
          <QRScannerDialog
            open={qrScannerOpen}
            onOpenChange={setQrScannerOpen}
          />
          <AddLeaveRequestDialog
            employeeId={userProfile.employeeId}
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
          />
          <CreatePostModal
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            canPostAnnouncement={userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'hr'}
            canPostExecutive={userProfile?.role === 'owner' || userProfile?.role === 'admin'}
          />
          <RemoteCheckInDialog
            open={remoteCheckInOpen}
            onOpenChange={setRemoteCheckInOpen}
          />
        </>
      )}

      {/* Global Search Command Palette */}
      <GlobalSearch open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />

      {/* Get Help Dialog */}
      <GetHelpDialog open={getHelpDialogOpen} onOpenChange={setGetHelpDialogOpen} />
    </>
  );
};
