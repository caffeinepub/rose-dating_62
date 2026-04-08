import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Crown,
  Edit2,
  Image as ImageIcon,
  LogOut,
  Mic,
  Search,
  Send,
  Settings,
  UserMinus,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import ExpiredMediaPlaceholder from "../components/ExpiredMediaPlaceholder";
import VideoRecorder from "../components/VideoRecorder";
import VoiceRecorder from "../components/VoiceRecorder";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddGroupParticipant,
  useGetConversations,
  useGetGroupDetails,
  useGetGroupMessages,
  useGetUserProfile,
  useLeaveGroup,
  useRemoveGroupParticipant,
  useSendGroupMessage,
  useUpdateGroupAvatar,
  useUpdateGroupName,
} from "../hooks/useQueries";
import { isMediaExpired } from "../lib/mediaExpiration";

const MEMBERS_PAGE_SIZE = 19;

// Inline video player for group messages — injects <source> with MIME type for mobile compatibility
function GroupVideoPlayer({ blob }: { blob: ExternalBlob }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = blob.getDirectURL();

    const getMimeType = (url: string): string => {
      const ext = url.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "mp4":
          return "video/mp4";
        case "webm":
          return "video/webm";
        case "ogg":
          return "video/ogg";
        default:
          return "video/mp4";
      }
    };

    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);

    const handleError = () => {
      console.error("Group video playback error");
    };
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("error", handleError);
    };
  }, [blob]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
    />
  );
}

// Inline audio player for group messages — injects <source> with MIME type for mobile compatibility
function GroupAudioPlayer({ blob }: { blob: ExternalBlob }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const src = blob.getDirectURL();

    const getMimeType = (url: string): string => {
      const ext = url.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "mp3":
          return "audio/mpeg";
        case "wav":
          return "audio/wav";
        case "ogg":
          return "audio/ogg";
        case "webm":
          return "audio/webm";
        default:
          return "audio/mpeg";
      }
    };

    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    audio.appendChild(source);

    const handleError = () => {
      console.error("Group audio playback error");
    };
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("error", handleError);
    };
  }, [blob]);

  return (
    <audio
      ref={audioRef}
      controls
      className="max-w-[200px]"
      preload="metadata"
    />
  );
}

// Participant profile row
function ParticipantRow({
  principal,
  isAdmin,
  isCreator,
  isCurrentUser,
  canManage,
  onRemove,
  onNavigate,
  searchQuery,
}: {
  principal: string;
  isAdmin: boolean;
  isCreator: boolean;
  isCurrentUser: boolean;
  canManage: boolean;
  onRemove: () => void;
  onNavigate: () => void;
  searchQuery?: string;
}) {
  const { data: profile } = useGetUserProfile(principal);

  // Filter by username or name when a search query is provided
  if (searchQuery?.trim()) {
    const q = searchQuery.toLowerCase();
    const name = (profile?.name ?? "").toLowerCase();
    const username = (profile?.username ?? "").toLowerCase();
    if (!name.includes(q) && !username.includes(q)) {
      return null;
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <button onClick={onNavigate} className="flex-shrink-0">
        <img
          src={
            profile?.profilePicture?.getDirectURL() ||
            "/assets/generated/avatar-placeholder.dim_200x200.png"
          }
          alt={profile?.name || "User"}
          className="w-9 h-9 rounded-full object-cover border border-primary/20"
        />
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onNavigate} className="text-left">
          <p className="text-sm font-medium text-foreground truncate">
            {profile?.name || "Loading..."}
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground ml-1">(you)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{profile?.username || "..."}
          </p>
        </button>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isCreator && <Crown size={14} className="text-yellow-500" />}
        {isAdmin && !isCreator && (
          <span className="text-xs text-primary font-medium">Admin</span>
        )}
        {canManage && !isCurrentUser && !isCreator && (
          <button
            onClick={onRemove}
            className="p-1 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
            title="Remove member"
          >
            <UserMinus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// Contact type for the add-member picker
interface Contact {
  principalStr: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

// Add Member Picker component
function AddMemberPicker({
  contacts,
  onAdd,
  isPending,
}: {
  contacts: Contact[];
  onAdd: (principalStr: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedPrincipal, setSelectedPrincipal] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const selectedContact = contacts.find(
    (c) => c.principalStr === selectedPrincipal,
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (principalStr: string) => {
    setSelectedPrincipal(principalStr);
    setDropdownOpen(false);
    setSearch("");
  };

  const handleAdd = () => {
    if (!selectedPrincipal) return;
    onAdd(selectedPrincipal);
    setSelectedPrincipal("");
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-left hover:bg-muted/50 transition-colors"
        >
          {selectedContact ? (
            <>
              <img
                src={
                  selectedContact.avatarUrl ||
                  "/assets/generated/avatar-placeholder.dim_200x200.png"
                }
                alt={selectedContact.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
              <span className="flex-1 truncate font-medium">
                {selectedContact.name}
              </span>
              <span className="text-xs text-muted-foreground">
                @{selectedContact.username}
              </span>
            </>
          ) : (
            <span className="flex-1 text-muted-foreground">
              Select a contact to add...
            </span>
          )}
          <ChevronDown
            size={14}
            className="text-muted-foreground flex-shrink-0"
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-md">
                <Search
                  size={13}
                  className="text-muted-foreground flex-shrink-0"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or username..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Contact list */}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {contacts.length === 0
                    ? "No contacts available to add"
                    : "No contacts match your search"}
                </div>
              ) : (
                filtered.map((contact) => (
                  <button
                    key={contact.principalStr}
                    type="button"
                    onClick={() => handleSelect(contact.principalStr)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/60 transition-colors text-left"
                  >
                    <img
                      src={
                        contact.avatarUrl ||
                        "/assets/generated/avatar-placeholder.dim_200x200.png"
                      }
                      alt={contact.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {contact.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{contact.username}
                      </p>
                    </div>
                    {selectedPrincipal === contact.principalStr && (
                      <Check size={14} className="text-primary flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Button
        size="sm"
        onClick={handleAdd}
        disabled={!selectedPrincipal || isPending}
        className="w-full"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground" />
            Adding...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <UserPlus size={14} />
            Add to Group
          </span>
        )}
      </Button>
    </div>
  );
}

export default function GroupChatPage() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toString() || "";

  const groupIdBigInt = BigInt(groupId);

  const { data: group, isLoading: groupLoading } =
    useGetGroupDetails(groupIdBigInt);
  const { data: messages = [], isLoading: messagesLoading } =
    useGetGroupMessages(groupIdBigInt);
  const { data: conversations = [] } = useGetConversations();

  const sendMessageMutation = useSendGroupMessage();
  const leaveGroupMutation = useLeaveGroup();
  const updateNameMutation = useUpdateGroupName();
  const updateAvatarMutation = useUpdateGroupAvatar();
  const addParticipantMutation = useAddGroupParticipant();
  const removeParticipantMutation = useRemoveGroupParticipant();

  const [showSettings, setShowSettings] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [visibleMembers, setVisibleMembers] = useState(MEMBERS_PAGE_SIZE);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages is the correct dep for scroll-to-bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset member pagination when search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: memberSearch is intentionally watched to reset pagination
  useEffect(() => {
    setVisibleMembers(MEMBERS_PAGE_SIZE);
  }, [memberSearch]);

  const isAdmin =
    group?.admins.some((a) => a.toString() === currentPrincipal) ?? false;
  const isCreator = group?.creator.toString() === currentPrincipal;

  // All participants (no client-side filtering — search is handled per-row via profile data)
  const allParticipants = group?.participants || [];

  const visibleParticipants = allParticipants.slice(0, visibleMembers);
  const hasMoreMembers = allParticipants.length > visibleMembers;

  // Build contacts list from conversations — unique contacts not already in the group
  const availableContacts = useMemo<Contact[]>(() => {
    const groupParticipantSet = new Set(
      allParticipants.map((p) => p.toString()),
    );
    const seen = new Set<string>();
    const contacts: Contact[] = [];

    for (const conv of conversations) {
      const otherPrincipal = conv.participants.find(
        (p) => p.toString() !== currentPrincipal,
      );
      if (!otherPrincipal) continue;

      const principalStr = otherPrincipal.toString();

      if (groupParticipantSet.has(principalStr)) continue;
      if (seen.has(principalStr)) continue;
      seen.add(principalStr);

      const profile = conv.otherParticipantProfile;
      if (!profile) continue;

      contacts.push({
        principalStr,
        name: profile.name,
        username: profile.username,
        avatarUrl: profile.profilePicture?.getDirectURL(),
      });
    }

    contacts.sort((a, b) => a.name.localeCompare(b.name));
    return contacts;
  }, [conversations, allParticipants, currentPrincipal]);

  const handleSendText = async () => {
    if (!messageText.trim()) return;
    try {
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "text", text: messageText.trim() },
      });
      setMessageText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "image", image: blob },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send image");
    }
    e.target.value = "";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      await updateAvatarMutation.mutateAsync({
        groupId: groupIdBigInt,
        avatar: blob,
      });
      toast.success("Group avatar updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update avatar");
    }
    e.target.value = "";
  };

  const handleUpdateName = async () => {
    if (!newGroupName.trim()) return;
    try {
      await updateNameMutation.mutateAsync({
        groupId: groupIdBigInt,
        newName: newGroupName.trim(),
      });
      setEditingName(false);
      setNewGroupName("");
      toast.success("Group name updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroupMutation.mutateAsync(groupIdBigInt);
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to leave group");
    }
  };

  const handleAddParticipant = async (principalStr: string) => {
    try {
      const { Principal } = await import("@dfinity/principal");
      const principal = Principal.fromText(principalStr);
      await addParticipantMutation.mutateAsync({
        groupId: groupIdBigInt,
        participant: principal,
      });
      toast.success("Participant added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add participant");
    }
  };

  const handleRemoveParticipant = async (participantPrincipal: string) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      const { Principal } = await import("@dfinity/principal");
      const principal = Principal.fromText(participantPrincipal);
      await removeParticipantMutation.mutateAsync({
        groupId: groupIdBigInt,
        participant: principal,
      });
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  // Handler for voice recorded — receives Blob, converts to Uint8Array<ArrayBuffer>
  const handleVoiceRecorded = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const extBlob = ExternalBlob.fromBytes(bytes);
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "voice", voice: extBlob },
      });
      setShowVoiceRecorder(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send voice message");
    }
  };

  // Handler for video recorded — receives Blob, converts to Uint8Array<ArrayBuffer>
  const handleVideoRecorded = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const extBlob = ExternalBlob.fromBytes(bytes);
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "video", video: extBlob },
      });
      setShowVideoRecorder(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send video message");
    }
  };

  const renderMessageContent = (
    content: (typeof messages)[0]["content"],
    timestamp: bigint,
  ) => {
    if (content.__kind__ === "text") {
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {content.text}
        </p>
      );
    }
    if (content.__kind__ === "image") {
      if (isMediaExpired(timestamp)) {
        return (
          <ExpiredMediaPlaceholder
            mediaType="image"
            className="max-w-[200px]"
          />
        );
      }
      return (
        <img
          src={content.image.getDirectURL()}
          alt="Shared media"
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        />
      );
    }
    if (content.__kind__ === "video") {
      if (isMediaExpired(timestamp)) {
        return (
          <ExpiredMediaPlaceholder
            mediaType="video"
            className="max-w-[200px]"
          />
        );
      }
      return <GroupVideoPlayer blob={content.video} />;
    }
    if (content.__kind__ === "voice") {
      if (isMediaExpired(timestamp)) {
        return (
          <ExpiredMediaPlaceholder
            mediaType="voice"
            className="max-w-[200px]"
          />
        );
      }
      return <GroupAudioPlayer blob={content.voice} />;
    }
    if (content.__kind__ === "media") {
      if (isMediaExpired(timestamp)) {
        return (
          <ExpiredMediaPlaceholder
            mediaType="media"
            className="max-w-[200px]"
          />
        );
      }
      return (
        <img
          src={content.media.getDirectURL()}
          alt="Media"
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        />
      );
    }
    return (
      <p className="text-sm text-muted-foreground italic">
        Unsupported message type
      </p>
    );
  };

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Group not found</p>
        <Button onClick={() => navigate({ to: "/" })}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={() => navigate({ to: "/" })}
          className="p-1 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <img
          src={
            group.avatar?.getDirectURL() ||
            "/assets/generated/group-avatar-placeholder.dim_200x200.png"
          }
          alt={group.name}
          className="w-9 h-9 rounded-full object-cover border border-primary/20"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm text-foreground truncate">
            {group.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {group.participants.length} members
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <Settings size={18} className="text-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs">
              Be the first to say something!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender.toString() === currentPrincipal;
            return (
              <div
                key={msg.id.toString()}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}
              >
                {!isOwn && (
                  <img
                    src={
                      msg.senderProfile?.profilePicture?.getDirectURL() ||
                      "/assets/generated/avatar-placeholder.dim_200x200.png"
                    }
                    alt={msg.senderProfile?.name || "User"}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 self-end"
                  />
                )}
                <div
                  className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                >
                  {!isOwn && (
                    <span className="text-xs text-muted-foreground px-1">
                      {msg.senderProfile?.name || "Unknown"}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {renderMessageContent(msg.content, msg.timestamp)}
                  </div>
                  <span className="text-xs text-muted-foreground px-1">
                    {new Date(
                      Number(msg.timestamp) / 1_000_000,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-border bg-background px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => setShowVoiceRecorder(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <Mic size={18} />
            </button>
            <button
              onClick={() => setShowVideoRecorder(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <Video size={18} />
            </button>
          </div>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendText()
            }
            placeholder="Type a message..."
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
          <button
            onClick={handleSendText}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Settings Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="font-semibold text-foreground">Group Settings</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Group Avatar */}
            <div className="flex flex-col items-center py-6 gap-3 border-b border-border">
              <div className="relative">
                <img
                  src={
                    group.avatar?.getDirectURL() ||
                    "/assets/generated/group-avatar-placeholder.dim_200x200.png"
                  }
                  alt={group.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                />
                {isAdmin && (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>

              {/* Group Name */}
              {editingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs px-4">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="flex-1 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateName}
                    disabled={updateNameMutation.isPending}
                  >
                    {updateNameMutation.isPending ? (
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingName(false);
                      setNewGroupName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-foreground">
                    {group.name}
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setNewGroupName(group.name);
                      }}
                      className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {group.participants.length} members
              </p>
            </div>

            {/* Add Member Section — only for admins */}
            {isAdmin && (
              <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus size={16} className="text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">
                    Add Member
                  </h4>
                </div>
                <AddMemberPicker
                  contacts={availableContacts}
                  onAdd={handleAddParticipant}
                  isPending={addParticipantMutation.isPending}
                />
                {availableContacts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    All your conversation contacts are already in this group, or
                    you have no direct message conversations yet.
                  </p>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Members
                </h4>
                <span className="text-xs text-muted-foreground">
                  ({group.participants.length})
                </span>
              </div>

              {/* Member search */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg mb-3">
                <Search
                  size={14}
                  className="text-muted-foreground flex-shrink-0"
                />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {memberSearch && (
                  <button
                    onClick={() => setMemberSearch("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="divide-y divide-border/50">
                {visibleParticipants.map((participant) => {
                  const pStr = participant.toString();
                  return (
                    <ParticipantRow
                      key={pStr}
                      principal={pStr}
                      isAdmin={group.admins.some((a) => a.toString() === pStr)}
                      isCreator={group.creator.toString() === pStr}
                      isCurrentUser={pStr === currentPrincipal}
                      canManage={isAdmin}
                      searchQuery={memberSearch}
                      onRemove={() => handleRemoveParticipant(pStr)}
                      onNavigate={() =>
                        navigate({
                          to: "/users/$userId",
                          params: { userId: pStr },
                        })
                      }
                    />
                  );
                })}
              </div>

              {hasMoreMembers && (
                <button
                  onClick={() =>
                    setVisibleMembers((v) => v + MEMBERS_PAGE_SIZE)
                  }
                  className="w-full mt-3 flex items-center justify-center gap-1 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ChevronDown size={14} />
                  Show more ({allParticipants.length - visibleMembers}{" "}
                  remaining)
                </button>
              )}
            </div>

            {/* Leave Group */}
            {!isCreator && (
              <div className="px-4 py-4 border-t border-border">
                <button
                  onClick={handleLeaveGroup}
                  disabled={leaveGroupMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {leaveGroupMutation.isPending ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  Leave Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onRecorded={handleVoiceRecorded}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Video Recorder Modal */}
      {showVideoRecorder && (
        <VideoRecorder
          onRecorded={handleVideoRecorded}
          onCancel={() => setShowVideoRecorder(false)}
        />
      )}
    </div>
  );
}
