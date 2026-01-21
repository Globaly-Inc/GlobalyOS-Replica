import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StructuredAddressInput, type AddressValue, EMPTY_ADDRESS } from "@/components/ui/structured-address-input";
import { Pencil, MapPin } from "lucide-react";
import { getCountryCodeFromName } from "@/lib/countries";

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

export function EditAddressDialog({ address, onSave }: EditAddressDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Convert incoming address to AddressValue format
      const countryCode = address.country 
        ? getCountryCodeFromName(address.country) || address.country
        : '';
      setAddressValue({
        country: countryCode,
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        postcode: address.postcode || '',
        lat: address.latitude ?? undefined,
        lng: address.longitude ?? undefined,
        place_id: address.place_id ?? undefined,
        google_maps_url: address.google_maps_url ?? undefined,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        street: addressValue.street || null,
        city: addressValue.city || null,
        state: addressValue.state || null,
        postcode: addressValue.postcode || null,
        country: addressValue.country || null,
        latitude: addressValue.lat ?? null,
        longitude: addressValue.lng ?? null,
        place_id: addressValue.place_id ?? null,
        google_maps_url: addressValue.google_maps_url ?? null,
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const hasValidAddress = !!addressValue.country && !!addressValue.street;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <StructuredAddressInput
            value={addressValue}
            onChange={setAddressValue}
            allowBusinesses={false}
          />

          {hasValidAddress && addressValue.google_maps_url && (
            <a 
              href={addressValue.google_maps_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <MapPin className="h-3 w-3" />
              View on Google Maps
            </a>
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
