import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AdminSetup } from "@/components/AdminSetup";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useHomeData } from "@/hooks/useHomeData";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { HomeMainContent } from "@/components/home/HomeMainContent";
import { HomeMobileLeaveSection } from "@/components/home/HomeMobileLeaveSection";

const Home = () => {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const { isHR } = useUserRole();
  
  const {
    hasEmployeeProfile,
    currentEmployeeId,
    currentUserName,
    currentUserBirthday,
    peopleOnLeave,
    upcomingTeamLeave,
    upcomingBirthdays,
    upcomingAnniversaries,
    upcomingCalendarEvents,
    weather,
    loadLeaveData,
    checkEmployeeProfile,
  } = useHomeData();

  return (
    <>
      <div className="space-y-4">
        <AdminSetup />
        
        {/* Page Title - Hero Section */}
        <HomeHeroSection
          currentUserName={currentUserName}
          currentUserBirthday={currentUserBirthday}
          weather={weather}
        />

        {/* Action Buttons for profile setup */}
        {!hasEmployeeProfile && isHR && (
          <Card className="p-6 border-accent/50 bg-accent-light/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Create Your Employee Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your profile to start posting updates and giving kudos
                </p>
              </div>
              <AddEmployeeDialog onSuccess={() => { checkEmployeeProfile(); }} />
            </div>
          </Card>
        )}

        {!hasEmployeeProfile && !isHR && (
          <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Employee Profile Not Found</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your HR department to set up your employee profile so you can start posting updates and giving kudos
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Mobile-only: Self Check-In, Pending Leave & On Leave Today */}
        <HomeMobileLeaveSection
          peopleOnLeave={peopleOnLeave}
          onLeaveDataChange={loadLeaveData}
        />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Feed (2/3) */}
          <HomeMainContent hasEmployeeProfile={hasEmployeeProfile} />

          {/* Right Column - Leave Sidebar (1/3) */}
          <HomeSidebar
            currentEmployeeId={currentEmployeeId}
            peopleOnLeave={peopleOnLeave}
            upcomingTeamLeave={upcomingTeamLeave}
            upcomingBirthdays={upcomingBirthdays}
            upcomingAnniversaries={upcomingAnniversaries}
            upcomingCalendarEvents={upcomingCalendarEvents}
            onLeaveDataChange={loadLeaveData}
          />
        </div>
      </div>

      {currentEmployeeId && (
        <AddLeaveRequestDialog
          employeeId={currentEmployeeId}
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          onSuccess={loadLeaveData}
          trigger={null}
        />
      )}
    </>
  );
};

export default Home;
