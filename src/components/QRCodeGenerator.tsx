import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, RefreshCw, Download, Building2, ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDateTime } from "@/lib/utils";
import QRCode from "qrcode";
import { QRLocationPicker } from "./QRLocationPicker";

interface Office {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

export const QRCodeGenerator = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch offices
  const { data: offices } = useQuery({
    queryKey: ["offices", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("offices")
        .select("id, name, city, country")
        .eq("organization_id", currentOrg.id)
        .order("name");
      
      if (error) throw error;
      return data as Office[];
    },
    enabled: !!currentOrg?.id,
  });

  // Auto-select first office
  useEffect(() => {
    if (offices?.length && !selectedOffice) {
      setSelectedOffice(offices[0].id);
    }
  }, [offices, selectedOffice]);

  // Fetch current QR code for selected office
  const { data: currentQRCode, isLoading: isLoadingQR } = useQuery({
    queryKey: ["qr-code", selectedOffice],
    queryFn: async () => {
      if (!selectedOffice) return null;
      const { data, error } = await supabase
        .from("office_qr_codes")
        .select("*")
        .eq("office_id", selectedOffice)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!selectedOffice,
  });

  // Generate QR code image when code changes
  useEffect(() => {
    const generateQRImage = async () => {
      if (currentQRCode?.code) {
        try {
          const dataUrl = await QRCode.toDataURL(currentQRCode.code, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error("Error generating QR code image:", error);
        }
      } else {
        setQrCodeDataUrl("");
      }
    };
    generateQRImage();
  }, [currentQRCode?.code]);

  // Get current employee ID
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Generate new QR code mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOffice || !currentOrg?.id || !currentEmployee?.id) {
        throw new Error("Missing required data");
      }

      // Deactivate existing QR code
      await supabase
        .from("office_qr_codes")
        .update({ is_active: false })
        .eq("office_id", selectedOffice)
        .eq("is_active", true);

      // Generate new unique code
      const newCode = `${selectedOffice}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // Insert new QR code
      const { error } = await supabase
        .from("office_qr_codes")
        .insert({
          office_id: selectedOffice,
          organization_id: currentOrg.id,
          code: newCode,
          created_by: currentEmployee.id,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-code", selectedOffice] });
      toast.success("New QR code generated successfully");
    },
    onError: (error: any) => {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    },
  });

  const handleDownload = () => {
    if (!qrCodeDataUrl || !selectedOffice) return;
    
    const selectedOfficeName = offices?.find(o => o.id === selectedOffice)?.name || "office";
    const link = document.createElement("a");
    link.download = `qr-code-${selectedOfficeName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const selectedOfficeName = offices?.find(o => o.id === selectedOffice)?.name;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <QrCode className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">Attendance QR</h3>
            {currentQRCode?.created_at ? (
              <p className="text-xs text-muted-foreground truncate">
                {formatDateTime(currentQRCode.created_at)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not generated</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !selectedOffice}
            title="Regenerate QR Code"
          >
            <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="View QR Code"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Attendance QR Code
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Office</label>
                  <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices?.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{office.name}</span>
                            {office.city && (
                              <span className="text-muted-foreground text-xs">({office.city})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOffice && (
                  <Tabs defaultValue="qr" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="qr">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </TabsTrigger>
                      <TabsTrigger value="location">
                        <MapPin className="h-4 w-4 mr-2" />
                        Location
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="qr" className="space-y-4 mt-4">
                      {isLoadingQR ? (
                        <div className="flex items-center justify-center h-[250px]">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : qrCodeDataUrl ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <img 
                              src={qrCodeDataUrl} 
                              alt="Attendance QR Code" 
                              className="w-[220px] h-[220px]"
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">{selectedOfficeName}</p>
                            <p className="text-xs text-muted-foreground">
                              Generated: {formatDateTime(currentQRCode?.created_at || "")}
                            </p>
                            {currentQRCode?.latitude && currentQRCode?.longitude && (
                              <p className="text-xs text-green-600 mt-1">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                Location enabled ({currentQRCode.radius_meters}m radius)
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] bg-muted/50 rounded-lg">
                          <QrCode className="h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No QR code generated yet</p>
                          <Button
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                            className="mt-4"
                            size="sm"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                            Generate QR Code
                          </Button>
                        </div>
                      )}

                      {qrCodeDataUrl && (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleDownload}
                            className="flex-1"
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download QR Code
                          </Button>
                          <Button
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                            variant="outline"
                            size="sm"
                          >
                            <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      )}

                      {currentQRCode && (
                        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded-lg text-center">
                          Regenerating will expire the current QR code
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="location" className="mt-4">
                      {currentQRCode ? (
                        <QRLocationPicker
                          qrCodeId={currentQRCode.id}
                          officeId={selectedOffice}
                          initialLatitude={currentQRCode.latitude}
                          initialLongitude={currentQRCode.longitude}
                          initialRadius={currentQRCode.radius_meters}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] bg-muted/50 rounded-lg">
                          <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground text-center">
                            Generate a QR code first to set location
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
};
