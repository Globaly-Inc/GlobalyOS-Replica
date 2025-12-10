import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { KudosCard } from "@/components/KudosCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Heart, MessageSquare, Plus, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostUpdateDialog } from "@/components/dialogs/PostUpdateDialog";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AdminSetup } from "@/components/AdminSetup";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";

interface FeedItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  employee: {
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface KudosItem {
  id: string;
  comment: string;
  created_at: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  given_by: {
    profiles: {
      full_name: string;
    };
  };
}

// Map database type to UI type (database uses "update", UI uses "announcement")
const mapDbTypeToUiType = (dbType: string): "win" | "announcement" | "achievement" => {
  if (dbType === "update") return "announcement";
  return dbType as "win" | "announcement" | "achievement";
};

const Home = () => {
  const [updates, setUpdates] = useState<FeedItem[]>([]);
  const [kudos, setKudos] = useState<KudosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const { isHR, isAdmin } = useUserRole();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (currentOrg) {
      checkEmployeeProfile();
      loadFeed();
    }
  }, [currentOrg?.id]);

  const checkEmployeeProfile = async () => {
    if (!currentOrg) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    setHasEmployeeProfile(!!data);
  };

  const loadFeed = async () => {
    if (!currentOrg) return;
    setLoading(true);
    
    // Load updates
    const { data: updatesData } = await supabase
      .from("updates")
      .select(`
        id,
        type,
        content,
        created_at,
        employee:employees!inner(
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false });

    // Load kudos
    const { data: kudosData } = await supabase
      .from("kudos")
      .select(`
        id,
        comment,
        created_at,
        employee:employees!kudos_employee_id_fkey(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        ),
        given_by:employees!kudos_given_by_id_fkey(
          profiles!inner(
            full_name
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (updatesData) setUpdates(updatesData as FeedItem[]);
    if (kudosData) setKudos(kudosData as KudosItem[]);
    setLoading(false);
  };

  const winsAndAchievements = updates.filter(u => 
    u.type === "win" || u.type === "achievement"
  );

  const regularUpdates = updates.filter(u => u.type === "update");

  return (
    <Layout>
      <div className="space-y-8">
        <AdminSetup />
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-primary p-8 text-primary-foreground shadow-lg">
          <div className="relative z-10 max-w-3xl">
            <h1 className="mb-3 text-4xl font-bold md:text-5xl">Welcome to TeamHub</h1>
            <p className="text-lg text-primary-foreground/90">
              Celebrate wins, share updates, and recognize your amazing team members
            </p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
            <Trophy className="absolute right-8 top-8 h-32 w-32" />
            <Heart className="absolute bottom-8 right-20 h-24 w-24" />
          </div>
        </div>

        {/* Action Buttons */}
        {!hasEmployeeProfile && isHR && (
          <Card className="p-6 border-accent/50 bg-accent-light/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Create Your Employee Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your profile to start posting updates and giving kudos
                </p>
              </div>
              <AddEmployeeDialog onSuccess={() => {
                checkEmployeeProfile();
                loadFeed();
              }} />
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

        {/* Feed Section */}
        <div>
          <Tabs defaultValue="all" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="h-auto p-1.5">
                <TabsTrigger value="all" className="px-3 py-2">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span>All</span>
                </TabsTrigger>
                <TabsTrigger value="wins" className="px-3 py-2">
                  <Trophy className="h-4 w-4 shrink-0" />
                  <span>Wins</span>
                </TabsTrigger>
                <TabsTrigger value="kudos" className="px-3 py-2">
                  <Heart className="h-4 w-4 shrink-0" />
                  <span>Kudos</span>
                </TabsTrigger>
                <TabsTrigger value="announcements" className="px-3 py-2">
                  <Megaphone className="h-4 w-4 shrink-0" />
                  <span>Announcements</span>
                </TabsTrigger>
              </TabsList>
              {hasEmployeeProfile && (
                <Button onClick={() => setPostDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Post Update
                </Button>
              )}
            </div>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">Loading feed...</p>
                </Card>
              ) : (
                <>
                  {[...updates, ...kudos]
                    .sort((a, b) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    .map((item) => {
                      if ("comment" in item) {
                        const kudosItem = item as KudosItem;
                        return (
                          <KudosCard
                            key={item.id}
                            kudos={{
                              id: kudosItem.id,
                              employeeId: kudosItem.employee.id,
                              employeeName: kudosItem.employee.profiles.full_name,
                              givenBy: kudosItem.given_by.profiles.full_name,
                              comment: kudosItem.comment,
                              date: kudosItem.created_at,
                              avatar: kudosItem.employee.profiles.avatar_url || undefined,
                            }}
                          />
                        );
                      } else {
                        const updateItem = item as FeedItem;
                        return (
                          <UpdateCard
                            key={item.id}
                            update={{
                              id: updateItem.id,
                              employeeId: "",
                              employeeName: updateItem.employee.profiles.full_name,
                              content: updateItem.content,
                              date: updateItem.created_at,
                              type: mapDbTypeToUiType(updateItem.type),
                              avatar: updateItem.employee.profiles.avatar_url || undefined,
                            }}
                          />
                        );
                      }
                    })}
                  {updates.length === 0 && kudos.length === 0 && (
                    <Card className="p-12 text-center">
                      <p className="text-muted-foreground">No updates yet. Be the first to share!</p>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="wins" className="space-y-4">
              {winsAndAchievements.map((update) => (
                <UpdateCard
                  key={update.id}
                  update={{
                    id: update.id,
                    employeeId: "",
                    employeeName: update.employee.profiles.full_name,
                    content: update.content,
                    date: update.created_at,
                    type: update.type as "win" | "achievement",
                    avatar: update.employee.profiles.avatar_url || undefined,
                  }}
                />
              ))}
              {winsAndAchievements.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No wins yet!</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="kudos" className="space-y-4">
              {kudos.map((kudosItem) => (
                <KudosCard
                  key={kudosItem.id}
                  kudos={{
                    id: kudosItem.id,
                    employeeId: kudosItem.employee.id,
                    employeeName: kudosItem.employee.profiles.full_name,
                    givenBy: kudosItem.given_by.profiles.full_name,
                    comment: kudosItem.comment,
                    date: kudosItem.created_at,
                    avatar: kudosItem.employee.profiles.avatar_url || undefined,
                  }}
                />
              ))}
              {kudos.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No kudos yet!</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="announcements" className="space-y-4">
              {regularUpdates.map((update) => (
                <UpdateCard
                  key={update.id}
                  update={{
                    id: update.id,
                    employeeId: "",
                    employeeName: update.employee.profiles.full_name,
                    content: update.content,
                    date: update.created_at,
                    type: "announcement",
                    avatar: update.employee.profiles.avatar_url || undefined,
                  }}
                />
              ))}
              {regularUpdates.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No announcements yet!</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PostUpdateDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        onSuccess={loadFeed}
        canPostAnnouncement={isAdmin || isHR}
      />
    </Layout>
  );
};

export default Home;
