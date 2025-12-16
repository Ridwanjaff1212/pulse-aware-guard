import { useState } from "react";
import { User, Phone, Heart, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddContact: (contact: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
  }) => void;
}

const relationships = [
  "Family",
  "Partner",
  "Friend",
  "Neighbor",
  "Colleague",
  "Other",
];

export function AddContactDialog({
  open,
  onOpenChange,
  onAddContact,
}: AddContactDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");

  const handleSave = () => {
    if (name.trim() && (phone.trim() || email.trim()) && relationship) {
      onAddContact({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        relationship,
      });
      setName("");
      setPhone("");
      setEmail("");
      setRelationship("");
      onOpenChange(false);
    }
  };

  const isValid = name.trim() && (phone.trim() || email.trim()) && relationship;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Add Emergency Contact
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add someone you trust who will be notified in case of an emergency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Contact name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/50 border-border pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-secondary/50 border-border pl-10"
                type="tel"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email Address <span className="text-xs text-muted-foreground">(for emergency alerts)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="contact@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary/50 border-border pl-10"
                type="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Relationship
            </label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {relationships.map((rel) => (
                  <SelectItem key={rel} value={rel}>
                    {rel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={!isValid}>
              <Check className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
