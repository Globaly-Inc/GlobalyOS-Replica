import { Layout } from "@/components/Layout";
import { EmployeeCard } from "@/components/EmployeeCard";
import { employees } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

const Team = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">Team Directory</h1>
          <p className="text-muted-foreground">
            Meet our amazing team of {employees.length} members
          </p>
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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No employees found matching your search.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Team;
