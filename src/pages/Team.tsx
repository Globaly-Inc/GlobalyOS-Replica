import { Layout } from "@/components/Layout";
import { EmployeeCard } from "@/components/EmployeeCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface Employee {
  id: string;
  position: string;
  department: string;
  join_date: string;
  phone: string | null;
  location: string | null;
  manager_id: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

const Team = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select(`
        id,
        position,
        department,
        join_date,
        phone,
        location,
        manager_id,
        profiles!inner(
          full_name,
          email,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-foreground">Team Directory</h1>
            <p className="text-muted-foreground">
              Meet our amazing team of {employees.length} members
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/team/invite')} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Team Member
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, position, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading team members...</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={{
                    id: employee.id,
                    name: employee.profiles.full_name,
                    email: employee.profiles.email,
                    position: employee.position,
                    department: employee.department,
                    joinDate: employee.join_date,
                    phone: employee.phone || undefined,
                    location: employee.location || undefined,
                    avatar: employee.profiles.avatar_url || undefined,
                  }}
                />
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No employees found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Team;
