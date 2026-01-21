import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete, AddressComponents } from "@/components/ui/address-autocomplete";
import { Pencil, MapPin, Check } from "lucide-react";

interface AddressData {
  street: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  google_maps_url?: string | null;
}

interface EditAddressDialogProps {
  address: AddressData;
  onSave: (address: AddressData) => Promise<void>;
}

// Build a displayable address string from components
const buildAddressString = (address: AddressData): string => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postcode,
    address.country,
  ].filter(Boolean);
  return parts.join(', ');
};

export function EditAddressDialog({ address, onSave }: EditAddressDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  const [hasValidAddress, setHasValidAddress] = useState(false);
  const [formData, setFormData] = useState<AddressData>({
    street: address.street || "",
    city: address.city || "",
    state: address.state || "",
    postcode: address.postcode || "",
    country: address.country || "",
    latitude: address.latitude || null,
    longitude: address.longitude || null,
    place_id: address.place_id || null,
    google_maps_url: address.google_maps_url || null,
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const addressString = buildAddressString(address);
      setFullAddress(addressString);
      setHasValidAddress(!!address.street);
      setFormData({
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        postcode: address.postcode || "",
        country: address.country || "",
        latitude: address.latitude || null,
        longitude: address.longitude || null,
        place_id: address.place_id || null,
        google_maps_url: address.google_maps_url || null,
      });
    }
  };

  const handleAddressChange = (addr: string, components?: AddressComponents) => {
    setFullAddress(addr);
    if (components && components.formatted_address) {
      setFormData({
        street: components.street_number 
          ? `${components.street_number} ${components.route || ''}`.trim()
          : components.route || '',
        city: components.locality || '',
        state: components.administrative_area_level_1 || '',
        postcode: components.postal_code || '',
        country: components.country || '',
        latitude: components.lat || null,
        longitude: components.lng || null,
        place_id: components.place_id || null,
        google_maps_url: components.google_maps_url || null,
      });
      setHasValidAddress(true);
    } else {
      setHasValidAddress(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="address">Search Address</Label>
            <AddressAutocomplete
              value={fullAddress}
              onChange={handleAddressChange}
              placeholder="Start typing your address..."
              allowBusinesses={false}
            />
            <p className="text-xs text-muted-foreground">
              Search and select your home address from the suggestions
            </p>
          </div>

          {/* Show parsed address preview when valid */}
          {hasValidAddress && formData.street && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Address confirmed
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Street:</span>{' '}
                  <span className="text-foreground">{formData.street}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">City:</span>{' '}
                  <span className="text-foreground">{formData.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">State:</span>{' '}
                  <span className="text-foreground">{formData.state}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Postcode:</span>{' '}
                  <span className="text-foreground">{formData.postcode}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Country:</span>{' '}
                  <span className="text-foreground">{formData.country}</span>
                </div>
              </div>
              {formData.google_maps_url && (
                <a 
                  href={formData.google_maps_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <MapPin className="h-3 w-3" />
                  View on Google Maps
                </a>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !hasValidAddress}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
