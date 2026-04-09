import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CornerUpLeft,
  Crown,
  Edit2,
  Eye,
  Forward as ForwardIcon,
  Image as ImageIcon,
  LogOut,
  Mic,
  MoreHorizontal,
  Search,
  Send,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Conversation, ExternalBlob, type GroupMessage } from "../backend";
import ExpiredMediaPlaceholder from "../components/ExpiredMediaPlaceholder";
import VideoRecorder from "../components/VideoRecorder";
import VoiceRecorder from "../components/VoiceRecorder";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddGroupParticipant,
  useDeleteGroupMessage,
  useEditGroupMessage,
  useForwardGroupMessageToConversation,
  useGetConversations,
  useGetGroupDetails,
  useGetGroupMessages,
  useGetUserProfile,
  useLeaveGroup,
  useMarkGroupMessageRead,
  useReactToGroupMessage,
  useRemoveGroupParticipant,
  useSendGroupMessage,
  useUpdateGroupAvatar,
  useUpdateGroupName,
} from "../hooks/useQueries";
import { isMediaExpired } from "../lib/mediaExpiration";
import { getMimeType } from "../lib/mimeTypes";

const MEMBERS_PAGE_SIZE = 19;
const EMOJI_OPTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"] as const;

// Extended GroupMessage type to handle optional new backend fields
type ExtendedGroupMessage = GroupMessage & {
  reactions?: [string, string[]][];
  readBy?: string[];
  replyToId?: bigint | null;
};

// Emoji reactions overlay
function EmojiReactionPicker({
  onSelect,
  onClose,
  isOwn,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn: boolean;
}) {
  return (
    <div
      className={`absolute bottom-full mb-1 z-50 flex gap-1 bg-card border border-rose-100 rounded-full shadow-lg px-2 py-1 ${isOwn ? "right-0" : "left-0"}`}
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="text-lg hover:scale-125 transition-transform p-0.5 rounded-full hover:bg-rose-50"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Reaction badges below a message
function ReactionBadges({ reactions }: { reactions: [string, string[]][] }) {
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(([emoji, principals]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-0.5 bg-rose-50 border border-rose-100 rounded-full px-1.5 py-0.5 text-xs"
        >
          {emoji}
          {principals.length > 1 && (
            <span className="text-rose-600 font-medium">
              {principals.length}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// Reply-to quote block
function ReplyQuoteBlock({ text }: { text: string }) {
  return (
    <div className="border-l-2 border-rose-400 pl-2 mb-1 text-xs text-muted-foreground italic truncate max-w-full">
      {text}
    </div>
  );
}

// Enhanced video player for group messages
function GroupVideoPlayer({ blob }: { blob: ExternalBlob }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const src = blob.getDirectURL();
    while (video.firstChild) video.removeChild(video.firstChild);
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);
    video.load();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () =>
      toast.error("This video format may not be supported on your device.");
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [blob]);

  const handleVideoClick = async () => {
    const video = videoRef.current;
    if (!video) return;
    setHasInteracted(true);
    if (video.paused) {
      try {
        await video.play();
      } catch {
        toast.error("Failed to play video.");
      }
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative max-w-full">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
        onClick={handleVideoClick}
      />
      {!hasInteracted && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-2">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced audio player for group messages
function GroupAudioPlayer({ blob }: { blob: ExternalBlob }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const src = blob.getDirectURL();
    while (audio.firstChild) audio.removeChild(audio.firstChild);
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    audio.appendChild(source);
    audio.load();
    const handleError = () =>
      toast.error("This audio format may not be supported on your device.");
    audio.addEventListener("error", handleError);
    return () => audio.removeEventListener("error", handleError);
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

// Forward target type
type ForwardTarget = {
  kind: "conversation";
  id: bigint;
  name: string;
  avatar?: string;
};

// Forward message modal for groups
function ForwardGroupMessageModal({
  open,
  onClose,
  onForward,
  conversations,
}: {
  open: boolean;
  onClose: () => void;
  onForward: (target: ForwardTarget) => void;
  conversations: Conversation[];
}) {
  const [search, setSearch] = useState("");

  const targets: ForwardTarget[] = conversations.map((c) => ({
    kind: "conversation" as const,
    id: c.id,
    name: c.otherParticipantProfile?.name || `Conversation ${c.id.toString()}`,
    avatar: c.otherParticipantProfile?.profilePicture?.getDirectURL(),
  }));

  const filtered = search.trim()
    ? targets.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : targets;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <ForwardIcon className="h-4 w-4" />
            Forward Message
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 text-sm border-rose-200 focus:border-rose-400"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-2.5 text-muted-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No conversations found
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((target) => (
                <button
                  key={target.id.toString()}
                  type="button"
                  onClick={() => {
                    onForward(target);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {target.avatar ? (
                      <img
                        src={target.avatar}
                        alt={target.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-rose-600 text-xs font-bold">
                        {target.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {target.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Direct message
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Per-message action menu for group messages
function GroupMessageActions({
  message,
  isOwn,
  onEdit,
  onDelete,
  onForward,
  onReply,
}: {
  message: ExtendedGroupMessage;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onReply: () => void;
}) {
  const isText = message.content.__kind__ === "text";
  const isDeleted = message.isDeleted;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 text-muted-foreground flex-shrink-0"
          aria-label="Message actions"
          data-ocid="group-msg-actions-trigger"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isOwn ? "end" : "start"}
        className="min-w-[140px]"
      >
        {!isDeleted && (
          <DropdownMenuItem onClick={onReply} className="gap-2 cursor-pointer">
            <CornerUpLeft className="h-3.5 w-3.5 text-rose-500" />
            Reply
          </DropdownMenuItem>
        )}
        {!isDeleted && (
          <DropdownMenuItem
            onClick={onForward}
            className="gap-2 cursor-pointer"
          >
            <ForwardIcon className="h-3.5 w-3.5 text-rose-500" />
            Forward
          </DropdownMenuItem>
        )}
        {isOwn && isText && !isDeleted && (
          <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
            <Edit2 className="h-3.5 w-3.5 text-blue-500" />
            Edit
          </DropdownMenuItem>
        )}
        {isOwn && !isDeleted && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
}: {
  principal: string;
  isAdmin: boolean;
  isCreator: boolean;
  isCurrentUser: boolean;
  canManage: boolean;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const { data: profile } = useGetUserProfile(principal);

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

interface Contact {
  principalStr: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false);
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
        {dropdownOpen && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
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
  const editGroupMessage = useEditGroupMessage();
  const deleteGroupMessage = useDeleteGroupMessage();
  const forwardGroupMessage = useForwardGroupMessageToConversation();
  const reactToGroupMessage = useReactToGroupMessage();
  const markGroupMessageRead = useMarkGroupMessageRead();

  const [showSettings, setShowSettings] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [visibleMembers, setVisibleMembers] = useState(MEMBERS_PAGE_SIZE);
  const [videoSending, setVideoSending] = useState(false);
  // Edit/delete/forward state
  const [editingMessageId, setEditingMessageId] = useState<bigint | null>(null);
  const [editText, setEditText] = useState("");
  const [forwardingMessage, setForwardingMessage] =
    useState<ExtendedGroupMessage | null>(null);
  // Emoji reaction picker state
  const [emojiPickerForId, setEmojiPickerForId] = useState<bigint | null>(null);
  // Reply state
  const [replyTo, setReplyTo] = useState<{
    id: bigint;
    snippet: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages is the correct dep for scroll-to-bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark incoming messages as read when group chat loads
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on groupId change
  useEffect(() => {
    if (!currentPrincipal || messages.length === 0) return;
    const extMessages = messages as ExtendedGroupMessage[];
    for (const msg of extMessages) {
      if (msg.sender.toString() === currentPrincipal) continue;
      if (msg.isDeleted) continue;
      const readBy = msg.readBy ?? [];
      if (!readBy.includes(currentPrincipal)) {
        markGroupMessageRead.mutate({
          groupId: groupIdBigInt,
          messageId: msg.id,
        });
      }
    }
  }, [groupIdBigInt.toString(), currentPrincipal]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerForId) return;
    const handler = () => setEmojiPickerForId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [emojiPickerForId]);

  const isAdmin =
    group?.admins.some((a) => a.toString() === currentPrincipal) ?? false;
  const isCreator = group?.creator.toString() === currentPrincipal;
  const allParticipants = group?.participants || [];
  // sortedAllParticipants: sort by principal string (a stable sort proxy before profiles load)
  const sortedAllParticipants = [...allParticipants].sort((a, b) =>
    a.toString().localeCompare(b.toString()),
  );
  const visibleParticipants = sortedAllParticipants.slice(0, visibleMembers);
  const hasMoreMembers = sortedAllParticipants.length > visibleMembers;

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

  const getMessageSnippet = (msg: ExtendedGroupMessage): string => {
    if (msg.content.__kind__ === "text") return msg.content.text.slice(0, 50);
    if (msg.content.__kind__ === "image") return "📷 Image";
    if (msg.content.__kind__ === "video") return "🎥 Video";
    if (msg.content.__kind__ === "voice") return "🎤 Voice message";
    return "Message";
  };

  const getReplySnippet = (replyToId: bigint | null | undefined): string => {
    if (!replyToId) return "Original message";
    const orig = (messages as ExtendedGroupMessage[]).find(
      (m) => m.id === replyToId,
    );
    return orig ? getMessageSnippet(orig) : "Original message";
  };

  const startLongPress = (msgId: bigint) => {
    longPressTimerRef.current = setTimeout(() => {
      setEmojiPickerForId(msgId);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSendText = async () => {
    if (!messageText.trim()) return;
    try {
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "text", text: messageText.trim() },
        replyToId: replyTo?.id,
      });
      setMessageText("");
      setReplyTo(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send message");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await file.arrayBuffer()),
      );
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "image", image: blob },
      });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send image");
    }
    e.target.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      e.target.value = "";
      return;
    }
    setVideoSending(true);
    try {
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await file.arrayBuffer()),
      );
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "video", video: blob },
      });
      toast.success("Video sent!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send video");
    } finally {
      setVideoSending(false);
      e.target.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await file.arrayBuffer()),
      );
      await updateAvatarMutation.mutateAsync({
        groupId: groupIdBigInt,
        avatar: blob,
      });
      toast.success("Group avatar updated");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update avatar");
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
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update name");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroupMutation.mutateAsync(groupIdBigInt);
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to leave group");
    }
  };

  const handleAddParticipant = async (principalStr: string) => {
    try {
      const { Principal } = await import("@dfinity/principal");
      await addParticipantMutation.mutateAsync({
        groupId: groupIdBigInt,
        participant: Principal.fromText(principalStr),
      });
      toast.success("Participant added");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add participant");
    }
  };

  const handleRemoveParticipant = async (participantPrincipal: string) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      const { Principal } = await import("@dfinity/principal");
      await removeParticipantMutation.mutateAsync({
        groupId: groupIdBigInt,
        participant: Principal.fromText(participantPrincipal),
      });
      toast.success("Member removed");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to remove member");
    }
  };

  const handleVoiceRecorded = async (blob: Blob) => {
    try {
      const extBlob = ExternalBlob.fromBytes(
        new Uint8Array(await blob.arrayBuffer()),
      );
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "voice", voice: extBlob },
      });
      setShowVoiceRecorder(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send voice message");
    }
  };

  const handleVideoRecorded = async (blob: Blob) => {
    try {
      const extBlob = ExternalBlob.fromBytes(
        new Uint8Array(await blob.arrayBuffer()),
      );
      await sendMessageMutation.mutateAsync({
        groupId: groupIdBigInt,
        content: { __kind__: "video", video: extBlob },
      });
      setShowVideoRecorder(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send video message");
    }
  };

  const handleEditGroupMessage = async (msg: ExtendedGroupMessage) => {
    if (!editText.trim()) return;
    try {
      await editGroupMessage.mutateAsync({
        groupId: groupIdBigInt,
        messageId: msg.id,
        newText: editText.trim(),
      });
      setEditingMessageId(null);
      setEditText("");
      toast.success("Message edited");
    } catch {
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteGroupMessage = async (msg: ExtendedGroupMessage) => {
    try {
      await deleteGroupMessage.mutateAsync({
        groupId: groupIdBigInt,
        messageId: msg.id,
      });
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleForwardGroupMessage = async (
    msg: ExtendedGroupMessage,
    target: ForwardTarget,
  ) => {
    try {
      await forwardGroupMessage.mutateAsync({
        sourceGroupId: groupIdBigInt,
        messageId: msg.id,
        targetConversationId: target.id,
      });
      toast.success(`Forwarded to ${target.name}`);
    } catch {
      toast.error("Failed to forward message");
    }
  };

  const handleReactToGroupMessage = async (
    msg: ExtendedGroupMessage,
    emoji: string,
  ) => {
    try {
      await reactToGroupMessage.mutateAsync({
        groupId: groupIdBigInt,
        messageId: msg.id,
        emoji,
      });
    } catch {
      // Silent fail — reaction is a nice-to-have
    }
  };

  const renderMessageContent = (
    content: (typeof messages)[0]["content"],
    timestamp: bigint,
  ) => {
    if (content.__kind__ === "text")
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {content.text}
        </p>
      );
    if (content.__kind__ === "image") {
      if (isMediaExpired(timestamp))
        return (
          <ExpiredMediaPlaceholder
            mediaType="image"
            className="max-w-[200px]"
          />
        );
      return (
        <img
          src={content.image.getDirectURL()}
          alt="Shared media"
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        />
      );
    }
    if (content.__kind__ === "video") {
      if (isMediaExpired(timestamp))
        return (
          <ExpiredMediaPlaceholder
            mediaType="video"
            className="max-w-[200px]"
          />
        );
      return <GroupVideoPlayer blob={content.video} />;
    }
    if (content.__kind__ === "voice") {
      if (isMediaExpired(timestamp))
        return (
          <ExpiredMediaPlaceholder
            mediaType="voice"
            className="max-w-[200px]"
          />
        );
      return <GroupAudioPlayer blob={content.voice} />;
    }
    if (content.__kind__ === "media") {
      if (isMediaExpired(timestamp))
        return (
          <ExpiredMediaPlaceholder
            mediaType="media"
            className="max-w-[200px]"
          />
        );
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
          (messages as ExtendedGroupMessage[]).map((msg) => {
            const isOwn = msg.sender.toString() === currentPrincipal;
            const isEditing = editingMessageId === msg.id;
            const reactions = msg.reactions ?? [];
            const readBy = msg.readBy ?? [];
            const isSeen =
              isOwn &&
              group.participants.some(
                (p) =>
                  p.toString() !== currentPrincipal &&
                  readBy.includes(p.toString()),
              );
            const replyToId = msg.replyToId ?? null;
            const showEmojiPicker = emojiPickerForId === msg.id;

            return (
              <div
                key={msg.id.toString()}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 group`}
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
                    className={`flex items-center gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Message bubble with emoji reaction trigger */}
                    <div className="relative">
                      <div
                        className={`px-3 py-2 rounded-2xl cursor-pointer ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setEmojiPickerForId(msg.id);
                        }}
                        onTouchStart={() => startLongPress(msg.id)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                      >
                        {/* Reply quote */}
                        {replyToId && !msg.isDeleted && (
                          <ReplyQuoteBlock text={getReplySnippet(replyToId)} />
                        )}

                        {msg.isDeleted ? (
                          <p className="text-sm italic text-muted-foreground">
                            [Message deleted]
                          </p>
                        ) : isEditing ? (
                          <div className="flex gap-2 min-w-[180px]">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1 bg-background/20 border-0 outline-none text-sm text-inherit rounded px-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleEditGroupMessage(msg);
                                if (e.key === "Escape") {
                                  setEditingMessageId(null);
                                  setEditText("");
                                }
                              }}
                              data-ocid="group-msg-edit-input"
                            />
                            <button
                              type="button"
                              onClick={() => handleEditGroupMessage(msg)}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditText("");
                              }}
                              className="text-muted-foreground/70 hover:text-muted-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          renderMessageContent(msg.content, msg.timestamp)
                        )}
                      </div>

                      {/* Emoji picker overlay */}
                      {showEmojiPicker && !msg.isDeleted && (
                        <EmojiReactionPicker
                          isOwn={isOwn}
                          onSelect={(emoji) =>
                            handleReactToGroupMessage(msg, emoji)
                          }
                          onClose={() => setEmojiPickerForId(null)}
                        />
                      )}
                    </div>

                    {!msg.isDeleted && (
                      <div className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <GroupMessageActions
                          message={msg}
                          isOwn={isOwn}
                          onEdit={() => {
                            setEditingMessageId(msg.id);
                            setEditText(
                              msg.content.__kind__ === "text"
                                ? msg.content.text
                                : "",
                            );
                          }}
                          onDelete={() => handleDeleteGroupMessage(msg)}
                          onForward={() => setForwardingMessage(msg)}
                          onReply={() =>
                            setReplyTo({
                              id: msg.id,
                              snippet: getMessageSnippet(msg),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {reactions.length > 0 && (
                    <ReactionBadges reactions={reactions} />
                  )}

                  <div
                    className={`flex items-center gap-1.5 px-1 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <span className="text-xs text-muted-foreground">
                      {new Date(
                        Number(msg.timestamp) / 1_000_000,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.isEdited && !msg.isDeleted && (
                      <span className="text-xs text-muted-foreground italic">
                        (edited)
                      </span>
                    )}
                    {/* Read receipt */}
                    {isSeen && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        Seen
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-border bg-background px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-rose-50 border border-rose-100 rounded-lg">
            <CornerUpLeft className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-700 flex-1 truncate">
              Replying to: {replyTo.snippet}
            </p>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Send image"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() =>
                !videoSending && videoFileInputRef.current?.click()
              }
              disabled={videoSending}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
              aria-label="Send video"
            >
              <Video size={18} />
            </button>
            <button
              onClick={() => setShowVoiceRecorder(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Record voice"
            >
              <Mic size={18} />
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
            data-ocid="group-msg-input"
          />
          <button
            onClick={handleSendText}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
            data-ocid="group-msg-send-btn"
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
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
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
              {editingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs px-4">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="flex-1 text-sm"
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

            {/* Add Member Section */}
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
                  ({sortedAllParticipants.length})
                </span>
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
                  Show more ({sortedAllParticipants.length - visibleMembers}{" "}
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

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardGroupMessageModal
          open={!!forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={(target) => {
            if (forwardingMessage)
              handleForwardGroupMessage(forwardingMessage, target);
          }}
          conversations={conversations}
        />
      )}
    </div>
  );
}
