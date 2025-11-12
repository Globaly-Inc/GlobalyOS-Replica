import { Layout } from "@/components/Layout";
import { useParams } from "react-router-dom";
import { employees, kudosData } from "@/data/mockData";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KudosCard } from "@/components/KudosCard";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Heart,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

const TeamMemberProfile = () => {
  const { id } = useParams();
  const employee = employees.find((e) => e.id === id);
  const employeeKudos = kudosData.filter((k) => k.employeeId === id);

  if (!employee) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
          <Link to="/team">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Team
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <Link to="/team">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Button>
        </Link>

        {/* Profile Header */}
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary via-primary-dark to-primary" />
          <div className="relative px-6 pb-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <Avatar className="absolute -top-16 h-32 w-32 border-4 border-card">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-4xl font-bold">
                  {employee.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="mt-20 flex-1 sm:mt-0 sm:ml-36">
                <h1 className="text-3xl font-bold text-foreground">{employee.name}</h1>
                <p className="text-lg font-medium text-primary">{employee.position}</p>
                <Badge className="mt-2" variant="secondary">
                  {employee.department}
                </Badge>
              </div>
              <Button className="gap-2">
                <Heart className="h-4 w-4" />
                Give Kudos
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact Information */}
          <Card className="p-6 lg:col-span-1">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <User className="h-5 w-5 text-primary" />
              Contact Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{employee.email}</p>
                </div>
              </div>
              {employee.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{employee.phone}</p>
                  </div>
                </div>
              )}
              {employee.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">{employee.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(employee.joinDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              {employee.manager && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reports To</p>
                    <p className="text-sm font-medium text-foreground">{employee.manager}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Superpowers & Kudos */}
          <div className="space-y-6 lg:col-span-2">
            {/* Superpowers */}
            {employee.superpowers && employee.superpowers.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Superpowers
                </h2>
                <div className="flex flex-wrap gap-2">
                  {employee.superpowers.map((power, index) => (
                    <Badge key={index} variant="outline" className="bg-accent-light text-accent border-accent/20">
                      {power}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Kudos Received */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground">
                <Heart className="h-6 w-6 text-accent" />
                Kudos Received ({employeeKudos.length})
              </h2>
              {employeeKudos.length > 0 ? (
                <div className="space-y-4">
                  {employeeKudos.map((kudos) => (
                    <KudosCard key={kudos.id} kudos={kudos} />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No kudos yet. Be the first to recognize {employee.name.split(" ")[0]}!
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeamMemberProfile;
