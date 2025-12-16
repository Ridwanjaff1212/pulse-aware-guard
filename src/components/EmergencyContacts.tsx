import { Phone, Plus, User, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  avatar?: string;
}

interface EmergencyContactsProps {
  contacts: Contact[];
  onAddContact: () => void;
  className?: string;
}

export function EmergencyContacts({
  contacts,
  onAddContact,
  className,
}: EmergencyContactsProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Emergency Contacts
          </h3>
          <p className="text-sm text-muted-foreground">
            People who will be notified
          </p>
        </div>
        <Button variant="glass" size="sm" onClick={onAddContact}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-secondary p-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No emergency contacts yet
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onAddContact}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add your first contact
            </Button>
          </div>
        ) : (
          contacts.map((contact, index) => (
            <div
              key={contact.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border border-border/50 bg-secondary/30 p-4",
                "transition-all duration-200 hover:bg-secondary/50",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {contact.avatar ? (
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{contact.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {contact.relationship}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Phone className="h-4 w-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
