import { Layout } from "@/components/Layout";
import { KudosCard } from "@/components/KudosCard";
import { kudosData } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Heart, Plus } from "lucide-react";

const Kudos = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-foreground">Team Kudos</h1>
            <p className="text-muted-foreground">
              Celebrate and recognize your amazing teammates
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Give Kudos
          </Button>
        </div>

        {kudosData.length > 0 ? (
          <div className="space-y-4">
            {kudosData.map((kudos) => (
              <KudosCard key={kudos.id} kudos={kudos} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              No kudos yet. Be the first to recognize someone!
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Kudos;
