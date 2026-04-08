import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@dfinity/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  MessageSquare,
  Pin,
  Send,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
} from "lucide-react";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { CommentInteraction, Post, Story } from "../backend";
import { getMimeType } from "../lib/mimeTypes";

const POSTS_PAGE_SIZE = 9;
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBlockUser,
  useCommentOnPost,
  useDeleteComment,
  useFollowUser,
  useGetFollowerCount,
  useGetFollowingCount,
  useGetPinnedStories,
  useGetPostComments,
  useGetPostInteractions,
  useGetUserPosts,
  useGetUserProfile,
  useIsFollowing,
  useIsUserBlocked,
  useLikePost,
  useSavePost,
  useUnblockUser,
  useUnfollowUser,
} from "../hooks/useQueries";

// Helper to get initials
function getInitials(name?: string, principal?: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (principal) return principal.slice(0, 2).toUpperCase();
  return "??";
}

// Commenter avatar component for UserProfilePage
interface CommenterAvatarProps {
  principalId: string;
  currentUserPrincipal: string;
  onNavigate: (principalId: string) => void;
}

function CommenterAvatar({
  principalId,
  currentUserPrincipal,
  onNavigate,
}: CommenterAvatarProps) {
  const { data: profile, isLoading } = useGetUserProfile(principalId);
  const isCurrentUser = principalId === currentUserPrincipal;

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;
  const initials = getInitials(profile?.name, principalId);
  const displayName =
    profile?.username || profile?.name || `${principalId.slice(0, 8)}...`;

  const handleClick = () => {
    if (!isCurrentUser) onNavigate(principalId);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${!isCurrentUser ? "cursor-pointer" : ""} flex-shrink-0`}
        onClick={handleClick}
        title={!isCurrentUser ? `View ${displayName}'s profile` : undefined}
      >
        {isLoading ? (
          <Skeleton className="w-7 h-7 rounded-full" />
        ) : (
          <Avatar className="w-7 h-7 ring-1 ring-rose-200">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <span
        className={`text-xs font-semibold ${!isCurrentUser ? "cursor-pointer hover:text-rose-600 transition-colors" : ""}`}
        onClick={handleClick}
      >
        {isLoading ? <Skeleton className="h-3 w-16" /> : displayName}
      </span>
    </div>
  );
}

// Comment item for UserProfilePage
interface CommentItemProps {
  comment: CommentInteraction;
  postId: string;
  currentUserPrincipal: string;
  onNavigate: (principalId: string) => void;
}

function CommentItem({
  comment,
  postId,
  currentUserPrincipal,
  onNavigate,
}: CommentItemProps) {
  const deleteCommentMutation = useDeleteComment();
  const isOwner = comment.user.toString() === currentUserPrincipal;

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex gap-2 py-2">
      <CommenterAvatar
        principalId={comment.user.toString()}
        currentUserPrincipal={currentUserPrincipal}
        onNavigate={onNavigate}
      />
      <div className="flex-1 min-w-0">
        <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl px-3 py-2">
          <p className="text-sm text-foreground">{comment.comment}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(comment.timestamp)}
          </span>
          {isOwner && (
            <button
              className="text-xs text-red-400 hover:text-red-600 font-medium"
              onClick={() =>
                deleteCommentMutation.mutate({ postId, commentId: comment.id })
              }
              disabled={deleteCommentMutation.isPending}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Post card for user profile
interface PostCardProps {
  post: Post;
  currentUserPrincipal: string;
  onOpenComments: (post: Post) => void;
  onNavigate: (principalId: string) => void;
}

function PostCard({
  post,
  currentUserPrincipal: _currentUserPrincipal,
  onOpenComments,
  onNavigate: _onNavigate,
}: PostCardProps) {
  const { data: interactions } = useGetPostInteractions(post.id);
  const likePostMutation = useLikePost();
  const savePostMutation = useSavePost();
  const imageUrl = post.image ? post.image.getDirectURL() : null;

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {formatDate(post.timestamp)}
          </span>
        </div>
        <p className="text-sm text-foreground mb-3 leading-relaxed">
          {post.content}
        </p>
        {imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden">
            <img
              src={imageUrl}
              alt="Post"
              className="w-full object-cover max-h-64"
            />
          </div>
        )}
        <div className="flex items-center gap-4 pt-2 border-t border-rose-50">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
            onClick={() => likePostMutation.mutate(post.id)}
          >
            <Heart className="w-4 h-4" />
            <span>{interactions?.likes?.toString() ?? "0"}</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
            onClick={() => onOpenComments(post)}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{interactions?.comments?.toString() ?? "0"}</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-500 transition-colors ml-auto"
            onClick={() => savePostMutation.mutate(post.id)}
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Comments Modal for UserProfilePage
interface CommentsModalProps {
  post: Post | null;
  currentUserPrincipal: string;
  onClose: () => void;
  onNavigate: (principalId: string) => void;
}

function CommentsModal({
  post,
  currentUserPrincipal,
  onClose,
  onNavigate,
}: CommentsModalProps) {
  const { data: comments, isLoading } = useGetPostComments(post?.id ?? "");
  const commentMutation = useCommentOnPost();
  const [commentText, setCommentText] = useState("");

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;
    await commentMutation.mutateAsync({
      postId: post.id,
      comment: commentText.trim(),
      parentCommentId: null,
    });
    setCommentText("");
  };

  if (!post) return null;

  return (
    <Dialog open={!!post} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-rose-500" />
            Comments
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                </div>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="divide-y divide-rose-50">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id.toString()}
                  comment={comment}
                  postId={post.id}
                  currentUserPrincipal={currentUserPrincipal}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No comments yet. Be the first!
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t border-rose-100">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 rounded-full border-rose-200 focus:border-rose-400 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          <Button
            size="icon"
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-full flex-shrink-0"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Story viewer modal for Highlights
function HighlightStoryModal({
  story,
  onClose,
}: {
  story: Story | null;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!story || story.content.__kind__ !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    // Clear stale source children before re-attaching
    while (video.firstChild) video.removeChild(video.firstChild);
    const src = story.content.video.getDirectURL();
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);
    video.load();
    video.play().catch(() => {
      /* autoplay may be blocked on some devices */
    });
  }, [story]);

  if (!story) return null;

  const renderContent = () => {
    if (story.content.__kind__ === "image") {
      return (
        <img
          src={story.content.image.getDirectURL()}
          alt="Highlight"
          className="max-w-full max-h-[75vh] object-contain mx-auto rounded-xl"
        />
      );
    }
    if (story.content.__kind__ === "video") {
      return (
        <video
          ref={videoRef}
          className="max-w-full max-h-[75vh] mx-auto rounded-xl"
          controls
          playsInline
          muted
          preload="metadata"
        />
      );
    }
    return null;
  };

  return (
    <Dialog open={!!story} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 bg-black/95">
        <div className="relative min-h-[300px] flex items-center justify-center p-8">
          <button
            type="button"
            className="absolute top-2 right-2 z-10 text-white bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {renderContent()}
        </div>
        <div className="px-4 pb-3 text-center text-xs text-white/60">
          {new Date(Number(story.timestamp) / 1_000_000).toLocaleDateString(
            [],
            { month: "short", day: "numeric", year: "numeric" },
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Highlights section — horizontal row of pinned story thumbnails
function HighlightsSection({ userId }: { userId: string }) {
  const { data: pinnedStories, isLoading } = useGetPinnedStories(userId);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Pin className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Highlights
          </h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={i}
              className="w-16 h-16 rounded-full flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!pinnedStories || pinnedStories.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Pin className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Highlights
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {pinnedStories.map((story) => {
          const thumbUrl =
            story.content.__kind__ === "image"
              ? story.content.image.getDirectURL()
              : story.content.__kind__ === "video"
                ? story.content.video.getDirectURL()
                : null;

          return (
            <button
              key={story.id.toString()}
              type="button"
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              onClick={() => setViewingStory(story)}
              data-ocid="highlight-thumb"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-rose-400 via-pink-500 to-rose-600">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-background bg-rose-100 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                  {thumbUrl && story.content.__kind__ === "image" ? (
                    <img
                      src={thumbUrl}
                      alt="Highlight"
                      className="w-full h-full object-cover"
                    />
                  ) : story.content.__kind__ === "video" ? (
                    <div className="w-full h-full bg-rose-200 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-rose-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  ) : (
                    <Bookmark className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground max-w-[60px] truncate">
                {new Date(
                  Number(story.timestamp) / 1_000_000,
                ).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </button>
          );
        })}
      </div>

      <HighlightStoryModal
        story={viewingStory}
        onClose={() => setViewingStory(null)}
      />
    </div>
  );
}

export default function UserProfilePage() {
  // Route is /users/$userId as defined in App.tsx
  const { userId } = useParams({ from: "/users/$userId" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const currentUserPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: profile, isLoading: profileLoading } =
    useGetUserProfile(userId);
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(userId);
  const { data: followerCount } = useGetFollowerCount(userId);
  const { data: followingCount } = useGetFollowingCount(userId);
  const { data: isFollowing } = useIsFollowing(userId);
  const { data: isBlocked } = useIsUserBlocked(userId);

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [visiblePostCount, setVisiblePostCount] = useState(POSTS_PAGE_SIZE);

  // Sort posts newest first
  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => Number(b.timestamp - a.timestamp));
  }, [posts]);

  const visiblePosts = sortedPosts.slice(0, visiblePostCount);
  const hasMorePosts = sortedPosts.length > visiblePostCount;

  // Navigate to another user's profile using the correct route /users/$userId
  const handleNavigateToProfile = useCallback(
    (pid: string) => {
      if (pid !== userId) {
        navigate({ to: "/users/$userId", params: { userId: pid } });
      }
    },
    [navigate, userId],
  );

  const isOwnProfile = userId === currentUserPrincipal;

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;
  const initials = getInitials(profile?.name, userId);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-sm border-b border-rose-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/users" })}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-sm truncate">
            {profile.username || profile.name}
          </h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Info */}
        <div className="bg-white dark:bg-card rounded-2xl p-5 border border-rose-100 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 ring-4 ring-rose-200 flex-shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.name} />}
              <AvatarFallback className="bg-rose-100 text-rose-700 text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">
                {profile.name}
              </h1>
              <p className="text-sm text-rose-600 font-medium">
                @{profile.username}
              </p>
              {profile.country && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {profile.country}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-sm font-bold">
                    {followerCount?.toString() ?? "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">
                    {followingCount?.toString() ?? "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-2 mt-4">
              <Button
                className={`flex-1 rounded-full text-sm ${isFollowing ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
                onClick={() => {
                  if (isFollowing) {
                    unfollowMutation.mutate(Principal.fromText(userId));
                  } else {
                    followMutation.mutate(Principal.fromText(userId));
                  }
                }}
                disabled={
                  followMutation.isPending || unfollowMutation.isPending
                }
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-1.5" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() =>
                  navigate({
                    to: "/chats/$conversationId",
                    params: { conversationId: userId },
                  })
                }
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Message
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full ${isBlocked ? "border-green-200 text-green-700 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                onClick={() => {
                  if (isBlocked) {
                    unblockMutation.mutate(Principal.fromText(userId));
                  } else {
                    blockMutation.mutate(Principal.fromText(userId));
                  }
                }}
                disabled={blockMutation.isPending || unblockMutation.isPending}
              >
                {isBlocked ? (
                  <ShieldOff className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Highlights */}
        <HighlightsSection userId={userId} />

        {/* Posts */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Posts
          </h3>
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : sortedPosts.length > 0 ? (
            <>
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserPrincipal={currentUserPrincipal}
                  onOpenComments={setSelectedPost}
                  onNavigate={handleNavigateToProfile}
                />
              ))}
              {hasMorePosts && (
                <button
                  type="button"
                  onClick={() =>
                    setVisiblePostCount((v) => v + POSTS_PAGE_SIZE)
                  }
                  className="w-full py-2.5 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                >
                  View More ({sortedPosts.length - visiblePostCount} remaining)
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No posts yet
            </div>
          )}
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        post={selectedPost}
        currentUserPrincipal={currentUserPrincipal}
        onClose={() => setSelectedPost(null)}
        onNavigate={handleNavigateToProfile}
      />
    </div>
  );
}
