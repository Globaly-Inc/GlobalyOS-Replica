import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, Users, Save, Upload, Loader2, Check, ChevronsUpDown, Globe, FileText, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { AddressAutocomplete, AddressComponents } from "@/components/ui/address-autocomplete";
import { BUSINESS_CATEGORIES, getBusinessCategoryIcon } from "@/constants/businessCategories";
import { cn } from "@/lib/utils";

interface OrganizationSettingsProps {
  isOwner: boolean;
}

export function OrganizationSettings({ isOwner }: OrganizationSettingsProps) {
  const { toast } = useToast();
  const { currentOrg, refreshOrganizations } = useOrganization();
  
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [orgName, setOrgName] = useState("");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessAddressComponents, setBusinessAddressComponents] = useState<AddressComponents | null>(null);
  const [website, setWebsite] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [industry, setIndustry] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  
  const [businessCategoryOpen, setBusinessCategoryOpen] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
      setLegalBusinessName(currentOrg.legal_business_name || "");
      setBusinessAddress(currentOrg.business_address || "");
      setBusinessAddressComponents(currentOrg.business_address_components as AddressComponents | null);
      setWebsite(currentOrg.website || "");
      setBusinessRegistrationNumber(currentOrg.business_registration_number || "");
      setIndustry(currentOrg.industry || "");
      loadMemberCount();
    }
  }, [currentOrg]);

  const loadMemberCount = async () => {
    if (!currentOrg) return;
    const { count } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", currentOrg.id);
    setMemberCount(count || 0);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentOrg) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `org-logos/${currentOrg.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", currentOrg.id);

      if (updateError) throw updateError;

      await refreshOrganizations();
      toast({
        title: "Logo uploaded",
        description: "Organization logo has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddressChange = (address: string, components?: AddressComponents) => {
    setBusinessAddress(address);
    if (components) {
      setBusinessAddressComponents(components);
    }
  };

  const normalizeWebsite = (url: string): string => {
    if (!url.trim()) return "";
    let normalized = url.trim().toLowerCase();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    return normalized;
  };

  const handleSave = async () => {
    if (!currentOrg || !orgName.trim()) return;
    
    setLoading(true);
    try {
      const updatePayload: Record<string, unknown> = {
        name: orgName.trim(),
        legal_business_name: legalBusinessName.trim() || null,
        business_address: businessAddress || null,
        business_address_components: businessAddressComponents || null,
        website: normalizeWebsite(website) || null,
        business_registration_number: businessRegistrationNumber.trim() || null,
        industry: industry || null,
        country: businessAddressComponents?.country || currentOrg.country || null,
      };

      const { error } = await supabase
        .from("organizations")
        .update(updatePayload)
        .eq("id", currentOrg.id);

      if (error) throw error;

      await refreshOrganizations();
      toast({
        title: "Settings saved",
        description: "Organization details have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case "pro":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "enterprise":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const selectedCategory = BUSINESS_CATEGORIES.find(c => c.value === industry);
  const CategoryIcon = selectedCategory?.icon || Building2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Details
        </CardTitle>
        <CardDescription>
          Manage your organization's basic information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload Section */}
        <div className="space-y-3">
          <Label>Organization Logo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              <AvatarImage src={currentOrg?.logo_url || ""} alt={currentOrg?.name} className="object-cover" />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-lg font-semibold">
                {currentOrg?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="gap-2"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Square image recommended. Max 2MB.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Business Identity Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Business Identity</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Trading Business Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isOwner}
                placeholder="Your business trading name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalBusinessName">Legal Business Name</Label>
              <Input
                id="legalBusinessName"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                disabled={!isOwner}
                placeholder="Registered company name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Organization ID</Label>
            <Input value={currentOrg?.slug || ""} disabled className="font-mono text-sm" />
          </div>
        </div>

        {/* Business Details Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Business Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="businessAddress" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Business Address
            </Label>
            <AddressAutocomplete
              value={businessAddress}
              onChange={handleAddressChange}
              placeholder="Start typing your business address..."
              disabled={!isOwner}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Website
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!isOwner}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessRegistrationNumber" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Business Registration Number
              </Label>
              <Input
                id="businessRegistrationNumber"
                value={businessRegistrationNumber}
                onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                disabled={!isOwner}
                placeholder="ABN / ACN / Company Number"
              />
            </div>
          </div>
        </div>

        {/* Business Profile Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Business Profile</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Category</Label>
              <Popover open={businessCategoryOpen} onOpenChange={setBusinessCategoryOpen}>
                <PopoverTrigger asChild disabled={!isOwner}>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={businessCategoryOpen}
                    className="w-full justify-between"
                    disabled={!isOwner}
                  >
                    <span className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                      {selectedCategory?.label || "Select category..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {BUSINESS_CATEGORIES.map((category) => {
                          const Icon = category.icon;
                          return (
                            <CommandItem
                              key={category.value}
                              value={category.value}
                              onSelect={(value) => {
                                setIndustry(value);
                                setBusinessCategoryOpen(false);
                              }}
                            >
                              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {category.label}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  industry === category.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Company Size</Label>
              <Input 
                value={currentOrg?.company_size || "Not specified"} 
                disabled 
                className="text-muted-foreground" 
              />
              <p className="text-xs text-muted-foreground">Set during signup</p>
            </div>
          </div>

          {businessAddressComponents?.country && (
            <div className="space-y-2">
              <Label>Country</Label>
              <Input 
                value={businessAddressComponents.country} 
                disabled 
                className="text-muted-foreground" 
              />
              <p className="text-xs text-muted-foreground">Derived from business address</p>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {memberCount} team member{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
          <Badge className={getPlanBadgeClass(currentOrg?.plan || "free")}>
            {currentOrg?.plan?.toUpperCase() || "FREE"} Plan
          </Badge>
        </div>

        {isOwner && (
          <div className="pt-4">
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {!isOwner && (
          <p className="text-sm text-muted-foreground pt-4">
            Only organization owners can edit these settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
