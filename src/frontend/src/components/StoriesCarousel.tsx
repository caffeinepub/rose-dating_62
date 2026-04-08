import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Story } from "../backend";
import { ExternalBlob } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetActiveStories,
  useGetConversations,
  useGetGroupChats,
  useGetUserProfile,
  useMarkStoryAsViewed,
  useSendGroupMessage,
  useSendMessage,
} from "../hooks/useQueries";

export default function StoriesCarousel() {
  const { identity } = useInternetIdentity();
  const { data: stories } = useGetActiveStories();
  const markAsViewed = useMarkStoryAsViewed();
  const navigate = useNavigate();

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Group stories by author
  const storiesByAuthor =
    stories?.reduce(
      (acc, story) => {
        const authorId = story.author.toString();
        if (!acc[authorId]) {
          acc[authorId] = [];
        }
        acc[authorId].push(story);
        return acc;
      },
      {} as Record<string, Story[]>,
    ) || {};

  const authors = Object.keys(storiesByAuthor);

  const handleStoryClick = async (authorId: string) => {
    const authorStories = storiesByAuthor[authorId];
    if (authorStories && authorStories.length > 0) {
      setSelectedStory(authorStories[0]);
      setCurrentIndex(0);

      try {
        await markAsViewed.mutateAsync(authorStories[0].id);
      } catch (error) {
        console.error("Failed to mark story as viewed:", error);
      }
    }
  };

  const handleNext = async () => {
    if (!selectedStory) return;

    const authorStories = storiesByAuthor[selectedStory.author.toString()];
    if (currentIndex < authorStories.length - 1) {
      const nextStory = authorStories[currentIndex + 1];
      setSelectedStory(nextStory);
      setCurrentIndex(currentIndex + 1);

      try {
        await markAsViewed.mutateAsync(nextStory.id);
      } catch (error) {
        console.error("Failed to mark story as viewed:", error);
      }
    } else {
      const currentAuthorIndex = authors.indexOf(
        selectedStory.author.toString(),
      );
      if (currentAuthorIndex < authors.length - 1) {
        const nextAuthorId = authors[currentAuthorIndex + 1];
        const nextAuthorStories = storiesByAuthor[nextAuthorId];
        setSelectedStory(nextAuthorStories[0]);
        setCurrentIndex(0);

        try {
          await markAsViewed.mutateAsync(nextAuthorStories[0].id);
        } catch (error) {
          console.error("Failed to mark story as viewed:", error);
        }
      } else {
        setSelectedStory(null);
      }
    }
  };

  const handlePrevious = () => {
    if (!selectedStory) return;

    const authorStories = storiesByAuthor[selectedStory.author.toString()];
    if (currentIndex > 0) {
      setSelectedStory(authorStories[currentIndex - 1]);
      setCurrentIndex(currentIndex - 1);
    } else {
      const currentAuthorIndex = authors.indexOf(
        selectedStory.author.toString(),
      );
      if (currentAuthorIndex > 0) {
        const prevAuthorId = authors[currentAuthorIndex - 1];
        const prevAuthorStories = storiesByAuthor[prevAuthorId];
        setSelectedStory(prevAuthorStories[prevAuthorStories.length - 1]);
        setCurrentIndex(prevAuthorStories.length - 1);
      }
    }
  };

  const handleAvatarClick = (authorId: string) => {
    navigate({ to: `/users/${authorId}` });
  };

  const renderStoryContent = (story: Story) => {
    if (story.content.__kind__ === "image") {
      return (
        <img
          src={story.content.image.getDirectURL()}
          alt="Story"
          className="max-w-full max-h-[80vh] object-contain mx-auto"
        />
      );
    }
    if (story.content.__kind__ === "video") {
      return (
        <EnhancedVideoPlayer
          src={story.content.video.getDirectURL()}
          autoPlay
        />
      );
    }
    if (story.content.__kind__ === "media") {
      return (
        <div className="flex items-center justify-center h-full">
          <a
            href={story.content.media.getDirectURL()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            View Media
          </a>
        </div>
      );
    }
    return null;
  };

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {authors.map((authorId) => {
            const authorStories = storiesByAuthor[authorId];
            const isOwn = identity?.getPrincipal().toString() === authorId;

            return (
              <StoryThumbnail
                key={authorId}
                authorId={authorId}
                storyCount={authorStories.length}
                isOwn={isOwn}
                onClick={() => handleStoryClick(authorId)}
              />
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!selectedStory}
        onOpenChange={() => setSelectedStory(null)}
      >
        <DialogContent className="max-w-2xl p-0 bg-black/95">
          {selectedStory && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedStory(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              <StoryHeader
                authorId={selectedStory.author.toString()}
                timestamp={selectedStory.timestamp}
                onAvatarClick={handleAvatarClick}
              />

              <div className="min-h-[400px] flex items-center justify-center p-12">
                {renderStoryContent(selectedStory)}
              </div>

              <div className="absolute inset-y-0 left-0 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 ml-2"
                  onClick={handlePrevious}
                  disabled={
                    currentIndex === 0 &&
                    authors.indexOf(selectedStory.author.toString()) === 0
                  }
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 mr-2"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1 px-4">
                {storiesByAuthor[selectedStory.author.toString()].map(
                  (_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full ${
                        idx === currentIndex ? "bg-white" : "bg-white/30"
                      }`}
                    />
                  ),
                )}
              </div>

              {/* Story Interactions - Forward only (no gift) */}
              <StoryInteractions story={selectedStory} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EnhancedVideoPlayer({
  src,
  autoPlay,
}: { src: string; autoPlay?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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

    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);
    video.load();

    if (autoPlay) {
      video.play().catch((err) => {
        console.warn("Autoplay failed (user gesture required):", err);
      });
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [src, autoPlay]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    setHasInteracted(true);

    if (video.paused) {
      video.play().catch((err) => {
        console.error("Video play failed:", err);
        toast.error("Failed to play video");
      });
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative max-w-full max-h-[80vh] mx-auto">
      <video
        ref={videoRef}
        className="max-w-full max-h-[80vh] mx-auto cursor-pointer"
        controls
        playsInline
        muted={autoPlay}
        preload="metadata"
        onClick={handleVideoClick}
      />
      {!hasInteracted && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-4">
            <svg
              className="w-12 h-12 text-white"
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

function StoryThumbnail({
  authorId,
  storyCount,
  isOwn,
  onClick,
}: {
  authorId: string;
  storyCount: number;
  isOwn: boolean;
  onClick: () => void;
}) {
  const authorPrincipal = Principal.fromText(authorId);
  const { data: profile } = useGetUserProfile(authorPrincipal);

  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
      onClick={onClick}
    >
      <div className="relative">
        <div className="p-0.5 rounded-full bg-gradient-to-tr from-rose-400 via-pink-500 to-rose-600">
          <Avatar className="h-14 w-14 border-2 border-background">
            {profile?.profilePicture ? (
              <AvatarImage
                src={profile.profilePicture.getDirectURL()}
                alt={profile.name}
              />
            ) : null}
            <AvatarFallback>
              {profile?.name?.charAt(0).toUpperCase() ||
                authorId.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
          {storyCount}
        </div>
      </div>
      <p className="text-xs text-center max-w-[60px] truncate">
        {isOwn ? "You" : profile?.username || authorId.slice(0, 8)}
      </p>
    </div>
  );
}

function StoryHeader({
  authorId,
  timestamp,
  onAvatarClick,
}: {
  authorId: string;
  timestamp: bigint;
  onAvatarClick: (authorId: string) => void;
}) {
  const authorPrincipal = Principal.fromText(authorId);
  const { data: profile } = useGetUserProfile(authorPrincipal);

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
      <Avatar
        className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onAvatarClick(authorId)}
      >
        {profile?.profilePicture ? (
          <AvatarImage
            src={profile.profilePicture.getDirectURL()}
            alt={profile.name}
          />
        ) : null}
        <AvatarFallback className="text-xs">
          {profile?.name?.charAt(0).toUpperCase() ||
            authorId.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-white">
        <p
          className="text-sm font-semibold cursor-pointer hover:underline"
          onClick={() => onAvatarClick(authorId)}
        >
          {profile?.username || `${authorId.slice(0, 12)}...`}
        </p>
        <p className="text-xs opacity-80">
          {new Date(Number(timestamp) / 1000000).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function StoryInteractions({ story }: { story: Story }) {
  const [showForward, setShowForward] = useState(false);

  return (
    <>
      <div className="absolute bottom-16 left-0 right-0 px-4 z-10">
        <div className="flex items-center gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-white hover:bg-white/20"
            onClick={() => setShowForward(true)}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {showForward && (
        <ForwardStoryModal
          open={showForward}
          onClose={() => setShowForward(false)}
          story={story}
        />
      )}
    </>
  );
}

function ForwardStoryModal({
  open,
  onClose,
  story,
}: { open: boolean; onClose: () => void; story: Story }) {
  const { identity } = useInternetIdentity();
  const { data: conversations } = useGetConversations();
  const { data: groups } = useGetGroupChats();
  const sendMessage = useSendMessage();
  const sendGroupMessage = useSendGroupMessage();
  const [selectedConversations, setSelectedConversations] = useState<
    Set<bigint>
  >(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<bigint>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const handleForward = async () => {
    if (selectedConversations.size === 0 && selectedGroups.size === 0) {
      toast.error("Please select at least one conversation or group");
      return;
    }

    setIsSending(true);
    try {
      const ensureMobileCompatibleBlob = async (
        originalBlob: ExternalBlob,
      ): Promise<ExternalBlob> => {
        try {
          const bytes = await originalBlob.getBytes();
          return ExternalBlob.fromBytes(bytes);
        } catch (error) {
          console.error("Error processing blob:", error);
          return originalBlob;
        }
      };

      let forwardContent = story.content;

      if (story.content.__kind__ === "video") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.video,
        );
        forwardContent = { __kind__: "video", video: mobileCompatibleBlob };
      } else if (story.content.__kind__ === "image") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.image,
        );
        forwardContent = { __kind__: "image", image: mobileCompatibleBlob };
      } else if (story.content.__kind__ === "media") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.media,
        );
        forwardContent = { __kind__: "media", media: mobileCompatibleBlob };
      }

      const callerPrincipal = identity?.getPrincipal().toString();

      // Forward to conversations
      for (const convId of selectedConversations) {
        const conv = conversations?.find((c) => c.id === convId);
        if (conv) {
          const receiver = conv.participants.find(
            (p) => p.toString() !== callerPrincipal,
          );
          if (receiver) {
            await sendMessage.mutateAsync({
              receiver,
              content: forwardContent,
            });
          }
        }
      }

      // Forward to groups
      for (const groupId of selectedGroups) {
        await sendGroupMessage.mutateAsync({
          groupId,
          content: forwardContent,
        });
      }

      toast.success("Story forwarded successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to forward story");
    } finally {
      setIsSending(false);
    }
  };

  const toggleConversation = (convId: bigint) => {
    setSelectedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  };

  const toggleGroup = (groupId: bigint) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Forward Story</h3>

          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {conversations && conversations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Direct Messages
                  </p>
                  {conversations.map((conv) => (
                    <div
                      key={conv.id.toString()}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleConversation(conv.id)}
                    >
                      <Checkbox
                        checked={selectedConversations.has(conv.id)}
                        onCheckedChange={() => toggleConversation(conv.id)}
                      />
                      <Avatar className="h-8 w-8">
                        {conv.otherParticipantProfile?.profilePicture ? (
                          <AvatarImage
                            src={conv.otherParticipantProfile.profilePicture.getDirectURL()}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {conv.otherParticipantProfile?.name
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {conv.otherParticipantProfile?.name ||
                          conv.otherParticipantProfile?.username ||
                          "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {groups && groups.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 mt-3">
                    Group Chats
                  </p>
                  {groups.map((group) => (
                    <div
                      key={group.id.toString()}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <Checkbox
                        checked={selectedGroups.has(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <Avatar className="h-8 w-8">
                        {group.avatar ? (
                          <AvatarImage src={group.avatar.getDirectURL()} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{group.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!conversations || conversations.length === 0) &&
                (!groups || groups.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No conversations or groups available
                  </p>
                )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={
                isSending ||
                (selectedConversations.size === 0 && selectedGroups.size === 0)
              }
            >
              {isSending ? "Forwarding..." : "Forward"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
