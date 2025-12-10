import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { KudosCard } from "@/components/KudosCard";
import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GiveKudosDialog } from "@/components/dialogs/GiveKudosDialog";
import { Card } from "@/components/ui/card";
import { useOrganization } from "@/hooks/useOrganization";

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

const Kudos = () => {
  const [kudos, setKudos] = useState<KudosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (currentOrg) {
      loadKudos();
    }
  }, [currentOrg?.id]);

  const loadKudos = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
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

    if (data) setKudos(data as KudosItem[]);
    setLoading(false);
  };
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Team Kudos" 
          subtitle="Celebrate and recognize your amazing teammates"
        >
          <GiveKudosDialog onSuccess={loadKudos} />
        </PageHeader>

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading kudos...</p>
          </Card>
        ) : kudos.length > 0 ? (
          <div className="space-y-4">
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
