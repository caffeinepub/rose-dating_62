import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Principal } from "@icp-sdk/core/principal";
import { Camera } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreateGroupChat, useGetConversations } from "../hooks/useQueries";

interface CreateGroupChatModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateGroupChatModal({
  open,
  onClose,
}: CreateGroupChatModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<Principal[]>(
    [],
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { identity } = useInternetIdentity();
  const { data: conversations, isLoading: conversationsLoading } =
    useGetConversations();
  const createGroup = useCreateGroupChat();

  // Derive unique DM contacts from existing conversations
  const dmContacts = useMemo(() => {
    if (!conversations || !identity) return [];

    const callerPrincipal = identity.getPrincipal().toString();
    const seen = new Set<string>();
    const contacts: {
      principal: Principal;
      profile: {
        name: string;
        username: string;
        profilePicture?: ExternalBlob;
      };
    }[] = [];

    for (const conv of conversations) {
      // Only consider direct (2-participant) conversations
      if (conv.participants.length !== 2) continue;

      const otherPrincipal = conv.participants.find(
        (p) => p.toString() !== callerPrincipal,
      );

      if (!otherPrincipal) continue;
      const key = otherPrincipal.toString();
      if (seen.has(key)) continue;
      seen.add(key);

      // Use the embedded otherParticipantProfile if available
      if (conv.otherParticipantProfile) {
        contacts.push({
          principal: otherPrincipal,
          profile: conv.otherParticipantProfile,
        });
      }
    }

    return contacts;
  }, [conversations, identity]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleParticipant = (principal: Principal) => {
    setSelectedParticipants((prev) => {
      const exists = prev.find((p) => p.toString() === principal.toString());
      if (exists) {
        return prev.filter((p) => p.toString() !== principal.toString());
      }
      return [...prev, principal];
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedParticipants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    try {
      let avatar: ExternalBlob | null = null;
      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        avatar = ExternalBlob.fromBytes(uint8Array);
      }

      await createGroup.mutateAsync({
        name: groupName.trim(),
        participants: selectedParticipants,
        avatar,
      });

      toast.success("Group chat created!");
      setGroupName("");
      setSelectedParticipants([]);
      setAvatarFile(null);
      setAvatarPreview(null);
      onClose();
    } catch (error) {
      toast.error("Failed to create group chat");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} />
              ) : (
                <AvatarImage src="/assets/generated/group-avatar-placeholder.dim_200x200.png" />
              )}
              <AvatarFallback>GRP</AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              {avatarPreview ? "Change" : "Add"} Group Photo
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Select Participants *</Label>
            <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
              {conversationsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Loading contacts...
                </p>
              ) : dmContacts.length > 0 ? (
                dmContacts.map((contact) => (
                  <button
                    type="button"
                    key={contact.principal.toString()}
                    className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg cursor-pointer text-left"
                    onClick={() => handleToggleParticipant(contact.principal)}
                  >
                    <Checkbox
                      checked={selectedParticipants.some(
                        (p) => p.toString() === contact.principal.toString(),
                      )}
                      onCheckedChange={() =>
                        handleToggleParticipant(contact.principal)
                      }
                    />
                    <Avatar className="h-8 w-8">
                      {contact.profile.profilePicture ? (
                        <AvatarImage
                          src={contact.profile.profilePicture.getDirectURL()}
                        />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {contact.profile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {contact.profile.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{contact.profile.username}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No direct message contacts yet. Start a direct conversation
                  first to add participants to a group.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedParticipants.length} participant(s) selected
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={
                createGroup.isPending ||
                !groupName.trim() ||
                selectedParticipants.length === 0
              }
              className="flex-1"
            >
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
