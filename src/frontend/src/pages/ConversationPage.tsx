import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  Camera,
  Forward as ForwardIcon,
  Image as ImageIcon,
  LogOut,
  Mic,
  MoreVertical,
  Send,
  ShieldOff,
  Trash2,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, type Message, type MessageType } from "../backend";
import ExpiredMediaPlaceholder from "../components/ExpiredMediaPlaceholder";
import LoginButton from "../components/LoginButton";
import ProfileLinkMessageText from "../components/ProfileLinkMessageText";
import RoseGiftModal from "../components/RoseGiftModal";
import VideoRecorder from "../components/VideoRecorder";
import VoiceRecorder from "../components/VoiceRecorder";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBlockUser,
  useGetConversations,
  useGetRoseBalance,
  useGetUserProfile,
  useIsUserBlocked,
  useLeaveConversation,
  useSendMessage,
  useUnblockUser,
} from "../hooks/useQueries";
import { isMediaExpired } from "../lib/mediaExpiration";
import { containsProfileLink } from "../lib/profileLinkDetection";
import { getVideoUploadWarning } from "../lib/videoUploadGuidance";

// Enhanced video player component with unified MIME type handling and error handling
function EnhancedVideoPlayer({
  src,
  onPlay,
}: { src: string; onPlay?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Unified MIME type detection for all video formats
    const getMimeType = (url: string): string => {
      const ext = url.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "mp4":
          return "video/mp4";
        case "webm":
          return "video/webm";
        case "mov":
          return "video/quicktime";
        case "avi":
          return "video/x-msvideo";
        default:
          return "video/mp4";
      }
    };

    // Set video source with proper MIME type for mobile compatibility
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);

    // Handle play/pause events
    const handlePlay = () => {
      setIsPlaying(true);
      if (!hasTrackedView && onPlay) {
        onPlay();
        setHasTrackedView(true);
      }
    };
    const handlePause = () => setIsPlaying(false);

    // Handle video errors
    const handleError = () => {
      console.error("Video playback error");
      toast.error("This video format may not be supported on your device.");
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [src, hasTrackedView, onPlay]);

  const handleVideoClick = async () => {
    const video = videoRef.current;
    if (!video) return;

    setHasInteracted(true);

    if (video.paused) {
      try {
        await video.play();
      } catch (err) {
        console.error("Video play failed:", err);
        toast.error(
          "Failed to play video. This format may not be supported on your device.",
        );
      }
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative max-w-full">
      <video
        ref={videoRef}
        className="max-w-full rounded max-h-64 sm:max-h-96 cursor-pointer"
        controls
        playsInline
        preload="metadata"
        onClick={handleVideoClick}
      />
      {!hasInteracted && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3">
            <svg
              className="w-8 h-8 text-white"
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

// Enhanced audio player component with unified MIME type handling and error handling
function EnhancedAudioPlayer({
  src,
  type,
  onPlay,
}: { src: string; type: "voice" | "media"; onPlay?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Unified MIME type detection for all audio formats
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

    // Set audio source with proper MIME type for mobile compatibility
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    audio.appendChild(source);

    // Track view on first play
    const handlePlay = () => {
      if (!hasTrackedView && onPlay) {
        onPlay();
        setHasTrackedView(true);
      }
    };

    // Handle audio errors
    const handleError = () => {
      console.error("Audio playback error");
      toast.error("This audio format may not be supported on your device.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("error", handleError);
    };
  }, [src, hasTrackedView, onPlay]);

  return (
    <div className="flex items-center gap-2">
      {type === "voice" && <Mic className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />}
      <audio
        ref={audioRef}
        controls
        className="max-w-full h-8"
        preload="metadata"
      />
    </div>
  );
}

export default function ConversationPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { conversationId } = useParams({ from: "/chats/$conversationId" });

  const { data: conversations, isLoading } = useGetConversations();
  const { data: roseBalance } = useGetRoseBalance();
  const sendMessage = useSendMessage();
  const leaveConversation = useLeaveConversation();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const [messageText, setMessageText] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showRoseGift, setShowRoseGift] = useState(false);
  const [_showForwardDialog, _setShowForwardDialog] = useState(false);
  const [_selectedMessageToForward, _setSelectedMessageToForward] =
    useState<Message | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Try to parse conversationId as Principal for new chat flow
  let targetPrincipal: Principal | null = null;
  let isNewChatFlow = false;
  try {
    targetPrincipal = Principal.fromText(conversationId);
    isNewChatFlow = true;
  } catch {
    // Not a valid principal, treat as conversation ID
  }

  // Find existing conversation by ID or by participant principal
  const conversation = conversations?.find((conv) => {
    if (conv.id.toString() === conversationId) return true;
    if (targetPrincipal) {
      return conv.participants.some(
        (p) => p.toString() === targetPrincipal.toString(),
      );
    }
    return false;
  });

  // Determine the other participant
  let otherParticipant: Principal | null = null;
  if (conversation) {
    // Existing conversation - get other participant from conversation
    otherParticipant =
      conversation.participants.find(
        (p) => p.toString() !== identity?.getPrincipal().toString(),
      ) || null;
  } else if (isNewChatFlow && targetPrincipal) {
    // New chat flow - use the target principal
    otherParticipant = targetPrincipal;
  }

  // Fetch target user profile for new chat flow
  const { data: targetUserProfile } = useGetUserProfile(
    otherParticipant || Principal.anonymous(),
  );
  const { data: isBlocked } = useIsUserBlocked(
    otherParticipant || Principal.anonymous(),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: conversation.messages is the correct dep for scroll-to-bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !otherParticipant) return;

    const content: MessageType = {
      __kind__: "text",
      text: messageText.trim(),
    };

    try {
      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content,
      });
      setMessageText("");
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !otherParticipant) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    try {
      setUploadProgress(0);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
        (percentage) => {
          setUploadProgress(percentage);
        },
      );

      const content: MessageType = {
        __kind__: "image",
        image: blob,
      };

      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content,
      });

      toast.success("Image sent!");
    } catch (error) {
      toast.error("Failed to send image");
      console.error(error);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !otherParticipant) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // Show upload guidance warning if format is not ideal
    const warning = getVideoUploadWarning(file);
    if (warning) {
      toast.warning(warning, { duration: 5000 });
    }

    try {
      setUploadProgress(0);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
        (percentage) => {
          setUploadProgress(percentage);
        },
      );

      const content: MessageType = {
        __kind__: "video",
        video: blob,
      };

      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content,
      });

      toast.success("Video sent!");
    } catch (error) {
      toast.error("Failed to send video");
      console.error(error);
    } finally {
      setUploadProgress(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleVoiceRecorded = async (audioBlob: Blob) => {
    if (!otherParticipant) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array);

      const content: MessageType = {
        __kind__: "voice",
        voice: blob,
      };

      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content,
      });

      setShowVoiceRecorder(false);
      toast.success("Voice message sent!");
    } catch (error) {
      toast.error("Failed to send voice message");
      console.error(error);
    }
  };

  const handleVideoRecorded = async (videoBlob: Blob) => {
    if (!otherParticipant) return;

    try {
      const arrayBuffer = await videoBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array);

      const content: MessageType = {
        __kind__: "video",
        video: blob,
      };

      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content,
      });

      setShowVideoRecorder(false);
      toast.success("Video message sent!");
    } catch (error) {
      toast.error("Failed to send video message");
      console.error(error);
    }
  };

  const handleRoseGift = async (amount: number) => {
    if (!otherParticipant) return;

    const content: MessageType = {
      __kind__: "rose",
      rose: amount,
    };

    await sendMessage.mutateAsync({
      receiver: otherParticipant,
      content,
    });
  };

  const handleLeaveConversation = async () => {
    if (!conversation) return;

    try {
      await leaveConversation.mutateAsync(conversation.id);
      toast.success("Left conversation");
      navigate({ to: "/chats" });
    } catch (error: any) {
      toast.error(error.message || "Failed to leave conversation");
    }
  };

  const handleBlockUser = async () => {
    if (!otherParticipant) return;

    try {
      await blockUser.mutateAsync(otherParticipant);
      toast.success("User blocked");
      navigate({ to: "/chats" });
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
    }
  };

  const handleUnblockUser = async () => {
    if (!otherParticipant) return;

    try {
      await unblockUser.mutateAsync(otherParticipant);
      toast.success("User unblocked");
    } catch (error: any) {
      toast.error(error.message || "Failed to unblock user");
    }
  };

  const renderMessage = (message: Message) => {
    const isOwn =
      message.sender.toString() === identity?.getPrincipal().toString();
    const senderProfile = message.senderProfile;
    const senderName =
      senderProfile?.name || `${message.sender.toString().slice(0, 12)}...`;
    const avatarUrl = senderProfile?.profilePicture?.getDirectURL();
    const mediaExpired = isMediaExpired(message.timestamp);

    return (
      <div
        key={message.id.toString()}
        className={`flex gap-2 mb-3 sm:mb-4 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isOwn && (
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={senderName} />
            ) : null}
            <AvatarFallback className="text-[10px] sm:text-xs">
              {senderName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[70%]`}
        >
          <div
            className={`${
              isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
            } rounded-lg p-2 sm:p-3`}
          >
            {message.content.__kind__ === "text" &&
              (containsProfileLink(message.content.text) ? (
                <ProfileLinkMessageText text={message.content.text} />
              ) : (
                <p className="text-xs sm:text-sm break-words">
                  {message.content.text}
                </p>
              ))}
            {message.content.__kind__ === "image" &&
              (mediaExpired ? (
                <ExpiredMediaPlaceholder
                  mediaType="image"
                  className="max-w-full"
                />
              ) : (
                <img
                  src={message.content.image.getDirectURL()}
                  alt="Shared media"
                  className="max-w-full rounded max-h-64 sm:max-h-96 object-contain"
                />
              ))}
            {message.content.__kind__ === "video" &&
              (mediaExpired ? (
                <ExpiredMediaPlaceholder
                  mediaType="video"
                  className="max-w-full"
                />
              ) : (
                <EnhancedVideoPlayer
                  src={message.content.video.getDirectURL()}
                />
              ))}
            {message.content.__kind__ === "voice" &&
              (mediaExpired ? (
                <ExpiredMediaPlaceholder
                  mediaType="voice"
                  className="max-w-full"
                />
              ) : (
                <EnhancedAudioPlayer
                  src={message.content.voice.getDirectURL()}
                  type="voice"
                />
              ))}
            {message.content.__kind__ === "media" &&
              (mediaExpired ? (
                <ExpiredMediaPlaceholder
                  mediaType="media"
                  className="max-w-full"
                />
              ) : (
                <EnhancedAudioPlayer
                  src={message.content.media.getDirectURL()}
                  type="media"
                />
              ))}
            {message.content.__kind__ === "rose" && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌹</span>
                <span className="font-semibold">
                  {message.content.rose.toFixed(2)} Roses
                </span>
              </div>
            )}
            {message.content.__kind__ === "receipt" && (
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="font-semibold">Transaction Receipt</p>
                <p>{message.content.receipt.summary}</p>
                <p className="text-[10px] sm:text-xs opacity-75">
                  Fee: {message.content.receipt.fee.toFixed(2)} ROSES
                </p>
              </div>
            )}
            {message.content.__kind__ === "tradeRequest" && (
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="font-semibold">Trade Request</p>
                <p>{message.content.tradeRequest.summary}</p>
              </div>
            )}
            {message.content.__kind__ === "forwardedPost" && (
              <div className="space-y-2 text-xs sm:text-sm">
                <p className="font-semibold flex items-center gap-1">
                  <ForwardIcon className="h-3 w-3" />
                  Forwarded Post
                </p>
                <div className="bg-background/50 rounded p-2">
                  {message.content.forwardedPost.image && (
                    <img
                      src={message.content.forwardedPost.image.getDirectURL()}
                      alt="Post"
                      className="w-full rounded mb-2 max-h-32 object-cover"
                    />
                  )}
                  <p className="line-clamp-3">
                    {message.content.forwardedPost.contentSnippet}
                  </p>
                </div>
              </div>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">
            {new Date(Number(message.timestamp) / 1_000_000).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </span>
        </div>
      </div>
    );
  };

  if (!identity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Login Required</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground text-sm">
              Please log in to view conversations
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <Skeleton className="h-12 w-full mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Show "not found" only if it's not a valid principal and no conversation exists
  if (!conversation && !isNewChatFlow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Conversation not found
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={() => navigate({ to: "/chats" })}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chats
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine display profile for header
  const displayProfile =
    conversation?.otherParticipantProfile || targetUserProfile;
  const displayName =
    displayProfile?.name ||
    `${otherParticipant?.toString().slice(0, 12)}...` ||
    "Unknown";
  const displayAvatar = displayProfile?.profilePicture?.getDirectURL();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/chats" })}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Avatar
            className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 cursor-pointer"
            onClick={() =>
              otherParticipant &&
              navigate({
                to: "/users/$userId",
                params: { userId: otherParticipant.toString() },
              })
            }
          >
            {displayAvatar ? <AvatarImage src={displayAvatar} /> : null}
            <AvatarFallback className="text-xs sm:text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold text-sm sm:text-base truncate cursor-pointer hover:underline"
              onClick={() =>
                otherParticipant &&
                navigate({
                  to: "/users/$userId",
                  params: { userId: otherParticipant.toString() },
                })
              }
            >
              {displayName}
            </h2>
            {displayProfile?.username && (
              <p className="text-xs text-muted-foreground truncate">
                @{displayProfile.username}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation && (
              <DropdownMenuItem onClick={() => setShowLeaveDialog(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Conversation
              </DropdownMenuItem>
            )}
            {isBlocked ? (
              <DropdownMenuItem onClick={() => setShowUnblockDialog(true)}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Unblock User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => setShowBlockDialog(true)}
                className="text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2">
        {conversation && conversation.messages.length > 0 ? (
          <>
            {conversation.messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="max-w-md space-y-4">
              <div className="text-4xl sm:text-5xl mb-4">💬</div>
              <h3 className="text-lg sm:text-xl font-semibold">
                Start a new conversation
              </h3>
              <p className="text-sm text-muted-foreground">
                Send a message to {displayName} to start chatting
              </p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/chats" })}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chats
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Message Input Area */}
      <div className="border-t bg-card px-3 sm:px-4 py-3 sm:py-4 shrink-0">
        {uploadProgress !== null && (
          <div className="mb-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={!otherParticipant || uploadProgress !== null}
              className="shrink-0"
            >
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => videoInputRef.current?.click()}
              disabled={!otherParticipant || uploadProgress !== null}
              className="shrink-0"
            >
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={!otherParticipant}
              className="shrink-0"
            >
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowVideoRecorder(true)}
              disabled={!otherParticipant}
              className="shrink-0"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowRoseGift(true)}
              disabled={!otherParticipant}
              className="shrink-0"
            >
              <span className="text-base sm:text-lg">🌹</span>
            </Button>
          </div>

          <form onSubmit={handleSendTextMessage} className="flex-1 flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              disabled={!otherParticipant || sendMessage.isPending}
              className="flex-1 text-base"
            />
            <Button
              type="submit"
              size="icon"
              disabled={
                !messageText.trim() ||
                !otherParticipant ||
                sendMessage.isPending
              }
              className="shrink-0"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Modals */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onRecorded={handleVoiceRecorded}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}

      {showVideoRecorder && (
        <VideoRecorder
          onRecorded={handleVideoRecorded}
          onCancel={() => setShowVideoRecorder(false)}
        />
      )}

      {showRoseGift && otherParticipant && (
        <RoseGiftModal
          open={showRoseGift}
          recipientName={displayName}
          currentBalance={roseBalance || 0}
          onGift={handleRoseGift}
          onClose={() => setShowRoseGift(false)}
        />
      )}

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this conversation? You can always
              start a new one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveConversation}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block {displayName}? You will no longer
              see their content and they won't be able to contact you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock {displayName}? They will be able
              to contact you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockUser}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
