 import { useState } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Pencil } from 'lucide-react';
 
 interface OfficeAddressEditDialogProps {
   address: string | null;
   city: string | null;
   country: string | null;
   onSave: (address: string, city: string, country: string) => Promise<void>;
 }
 
 export const OfficeAddressEditDialog = ({ address, city, country, onSave }: OfficeAddressEditDialogProps) => {
   const [open, setOpen] = useState(false);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
     address: address || '',
     city: city || '',
     country: country || '',
   });
 
   const handleOpen = (isOpen: boolean) => {
     setOpen(isOpen);
     if (isOpen) {
       setFormData({
         address: address || '',
         city: city || '',
         country: country || '',
       });
     }
   };
 
   const handleSave = async () => {
     setSaving(true);
     try {
       await onSave(formData.address, formData.city, formData.country);
       setOpen(false);
     } finally {
       setSaving(false);
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
           <DialogTitle>Edit Office Address</DialogTitle>
         </DialogHeader>
         <div className="space-y-4 pt-4">
           <div className="space-y-2">
             <Label htmlFor="address">Street Address</Label>
             <Input
               id="address"
               value={formData.address}
               onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
               placeholder="Street address"
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="city">City</Label>
             <Input
               id="city"
               value={formData.city}
               onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
               placeholder="City"
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="country">Country</Label>
             <Input
               id="country"
               value={formData.country}
               onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
               placeholder="Country"
             />
           </div>
           <div className="flex justify-end gap-2 pt-4">
             <Button variant="outline" onClick={() => setOpen(false)}>
               Cancel
             </Button>
             <Button onClick={handleSave} disabled={saving}>
               {saving ? 'Saving...' : 'Save'}
             </Button>
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 };