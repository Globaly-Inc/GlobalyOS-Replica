import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { KudosCard } from "@/components/KudosCard";
import { updates, kudosData } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Heart, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";

const Home = () => {
  const [newUpdate, setNewUpdate] = useState("");

  const allFeed = [...updates, ...kudosData.map(k => ({
    id: k.id,
    employeeId: k.employeeId,
    employeeName: k.employeeName,
    content: `Received kudos from ${k.givenBy}: "${k.comment}"`,
    date: k.date,
    type: "achievement" as const,
  }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

        {/* Share Update Section */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-foreground">Share an Update</h2>
          <div className="space-y-4">
            <Textarea
              placeholder="Share a win, update, or achievement with your team..."
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              className="min-h-24 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Image
              </Button>
              <Button>Post Update</Button>
            </div>
          </div>
        </Card>

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
              {allFeed.map((item) => {
                const kudosItem = kudosData.find(k => k.id === item.id);
                return kudosItem ? (
                  <KudosCard key={item.id} kudos={kudosItem} />
                ) : (
                  <UpdateCard key={item.id} update={item as any} />
                );
              })}
            </TabsContent>

            <TabsContent value="wins" className="space-y-4">
              {updates
                .filter((u) => u.type === "win" || u.type === "achievement")
                .map((update) => (
                  <UpdateCard key={update.id} update={update} />
                ))}
            </TabsContent>

            <TabsContent value="kudos" className="space-y-4">
              {kudosData.map((kudos) => (
                <KudosCard key={kudos.id} kudos={kudos} />
              ))}
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              {updates
                .filter((u) => u.type === "update")
                .map((update) => (
                  <UpdateCard key={update.id} update={update} />
                ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
