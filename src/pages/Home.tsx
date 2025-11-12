import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { KudosCard } from "@/components/KudosCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Heart, MessageSquare, Plus, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostUpdateDialog } from "@/components/dialogs/PostUpdateDialog";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";

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

const Home = () => {
  const [updates, setUpdates] = useState<FeedItem[]>([]);
  const [kudos, setKudos] = useState<KudosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);

  useEffect(() => {
    checkEmployeeProfile();
    loadFeed();
  }, []);

  const checkEmployeeProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    setHasEmployeeProfile(!!data);
  };

  const loadFeed = async () => {
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
        {!hasEmployeeProfile && (
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

        {hasEmployeeProfile && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Share an Update</h2>
              <Button onClick={loadFeed} variant="ghost" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPostDialogOpen(true)} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Post Update
              </Button>
            </div>
          </Card>
        )}

        {/* Feed Section */}
        <div>
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="all" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="wins" className="gap-2">
                <Trophy className="h-4 w-4" />
                Wins
              </TabsTrigger>
              <TabsTrigger value="kudos" className="gap-2">
                <Heart className="h-4 w-4" />
                Kudos
              </TabsTrigger>
              <TabsTrigger value="updates" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Updates
              </TabsTrigger>
            </TabsList>

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
                              type: updateItem.type as "win" | "update" | "achievement",
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

            <TabsContent value="updates" className="space-y-4">
              {regularUpdates.map((update) => (
                <UpdateCard
                  key={update.id}
                  update={{
                    id: update.id,
                    employeeId: "",
                    employeeName: update.employee.profiles.full_name,
                    content: update.content,
                    date: update.created_at,
                    type: "update",
                    avatar: update.employee.profiles.avatar_url || undefined,
                  }}
                />
              ))}
              {regularUpdates.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No updates yet!</p>
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
      />
    </Layout>
  );
};

export default Home;
