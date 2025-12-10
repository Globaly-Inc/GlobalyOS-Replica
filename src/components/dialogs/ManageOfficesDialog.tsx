import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Building2, Plus, Trash2, Loader2, MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Office {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
}

interface ManageOfficesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfficesChange?: () => void;
}

export const ManageOfficesDialog = ({ open, onOpenChange, onOfficesChange }: ManageOfficesDialogProps) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOfficeId, setDeleteOfficeId] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  const [newOffice, setNewOffice] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
  });

  useEffect(() => {
    if (open && currentOrg) {
      loadOffices();
    }
  }, [open, currentOrg?.id]);

  const loadOffices = async () => {
    if (!currentOrg) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("offices")
      .select("id, name, address, city, country")
      .eq("organization_id", currentOrg.id)
      .order("name");

    if (error) {
      toast({
        title: "Error loading offices",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOffices(data || []);
    }
    setLoading(false);
  };

  const handleAddOffice = async () => {
    if (!newOffice.name.trim() || !currentOrg) return;

    setSaving(true);
    const { error } = await supabase.from("offices").insert({
      organization_id: currentOrg.id,
      name: newOffice.name.trim(),
      address: newOffice.address.trim() || null,
      city: newOffice.city.trim() || null,
      country: newOffice.country.trim() || null,
    });

    if (error) {
      toast({
        title: "Error adding office",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Office added",
        description: `${newOffice.name} has been added successfully`,
      });
      setNewOffice({ name: "", address: "", city: "", country: "" });
      loadOffices();
      onOfficesChange?.();
    }
    setSaving(false);
  };

  const handleDeleteOffice = async () => {
    if (!deleteOfficeId) return;

    const { error } = await supabase
      .from("offices")
      .delete()
      .eq("id", deleteOfficeId);

    if (error) {
      toast({
        title: "Error deleting office",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Office deleted",
        description: "The office has been removed",
      });
      loadOffices();
      onOfficesChange?.();
    }
    setDeleteOfficeId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Offices
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Office Form */}
            <Card className="p-4 space-y-4">
              <h3 className="font-medium text-sm">Add New Office</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="officeName">Office Name *</Label>
                  <Input
                    id="officeName"
                    value={newOffice.name}
                    onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                    placeholder="e.g., Headquarters, Sydney Office"
                  />
                </div>
                <div>
                  <Label htmlFor="officeAddress">Address</Label>
                  <Input
                    id="officeAddress"
                    value={newOffice.address}
                    onChange={(e) => setNewOffice({ ...newOffice, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="officeCity">City</Label>
                    <Input
                      id="officeCity"
                      value={newOffice.city}
                      onChange={(e) => setNewOffice({ ...newOffice, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="officeCountry">Country</Label>
                    <Input
                      id="officeCountry"
                      value={newOffice.country}
                      onChange={(e) => setNewOffice({ ...newOffice, country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddOffice} 
                  disabled={!newOffice.name.trim() || saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Office
                </Button>
              </div>
            </Card>

            {/* Existing Offices List */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Existing Offices ({offices.length})
              </h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : offices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No offices added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {offices.map((office) => (
                    <Card key={office.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{office.name}</p>
                          {(office.city || office.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[office.city, office.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteOfficeId(office.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOfficeId} onOpenChange={() => setDeleteOfficeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Office</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this office? Employees assigned to this office will have their office assignment removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOffice} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
