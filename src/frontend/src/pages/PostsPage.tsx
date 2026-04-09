import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  ChevronDown,
  Code2,
  Edit3,
  Eye,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Pin,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { CommentInteraction, Post } from "../backend";
import { ExternalBlob } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCommentOnPost,
  useCreatePost,
  useDeleteComment,
  useDeletePost,
  useEditPost,
  useGetCallerPosts,
  useGetCallerUserProfile,
  useGetPinnedTrendingPost,
  useGetPostComments,
  useGetPostInteractions,
  useGetPosts,
  useGetPostsFromFollowedUsers,
  useGetSavedPosts,
  useGetUserProfile,
  useLikePost,
  useSavePost,
  useUnlikePost,
  useUnsavePost,
} from "../hooks/useQueries";

const PAGE_SIZE = 12;

// ─── Embed helpers ────────────────────────────────────────────────────────────
const EMBED_PREFIX = "[embed:";
const EMBED_SUFFIX = "]";

function encodeEmbed(url: string): string {
  return `${EMBED_PREFIX}${url}${EMBED_SUFFIX}`;
}

function parseEmbed(content: string): {
  text: string;
  embedUrl: string | null;
} {
  const startIdx = content.indexOf(EMBED_PREFIX);
  if (startIdx === -1) return { text: content, embedUrl: null };
  const endIdx = content.indexOf(EMBED_SUFFIX, startIdx + EMBED_PREFIX.length);
  if (endIdx === -1) return { text: content, embedUrl: null };
  const embedUrl = content.slice(startIdx + EMBED_PREFIX.length, endIdx);
  const text = content.slice(0, startIdx).trim();
  return { text, embedUrl };
}

function extractEmbedSrcFromCode(embedCode: string): string | null {
  // Try to extract src from <iframe src="..."> or <blockquote data-...>
  const srcMatch = embedCode.match(/src=["']([^"']+)["']/i);
  if (srcMatch) return srcMatch[1];
  // For X/Twitter blockquotes: extract the tweet URL
  const hrefMatch = embedCode.match(
    /href=["'](https:\/\/(?:twitter|x)\.com\/[^"'?]+)["']/i,
  );
  if (hrefMatch) return hrefMatch[1];
  return null;
}

function detectEmbedType(url: string): "youtube" | "x" | "tiktok" | "unknown" {
  if (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("youtube-nocookie.com")
  )
    return "youtube";
  if (
    url.includes("twitter.com") ||
    url.includes("x.com") ||
    url.includes("twttr.com")
  )
    return "x";
  if (url.includes("tiktok.com")) return "tiktok";
  return "unknown";
}

// ─── Embed Renderer ───────────────────────────────────────────────────────────
function EmbedRenderer({ embedUrl }: { embedUrl: string }) {
  const type = detectEmbedType(embedUrl);

  if (type === "x") {
    // X/Twitter — link card style since iframes are restricted
    return (
      <a
        href={embedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors mt-2 mb-1 group"
        data-ocid="post-embed-x"
      >
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            View on X (Twitter)
          </p>
          <p className="text-xs text-muted-foreground truncate">{embedUrl}</p>
        </div>
        <svg
          className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    );
  }

  const isTikTok = type === "tiktok";
  const height = isTikTok ? "560px" : "315px";

  return (
    <div
      className="mt-2 mb-1 rounded-xl overflow-hidden w-full"
      style={{ height }}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        className="rounded-xl border-0 w-full"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="Embedded content"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        data-ocid="post-embed-iframe"
      />
    </div>
  );
}

// ─── Post Author Avatar ───────────────────────────────────────────────────────
function PostAuthorAvatar({ authorId }: { authorId: string }) {
  const { data: profile } = useGetUserProfile(authorId);
  const navigate = useNavigate();

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;

  return (
    <Avatar
      className="w-9 h-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/60 transition-all"
      onClick={() =>
        navigate({ to: "/users/$userId", params: { userId: authorId } })
      }
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.name} />}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
        {profile?.name?.charAt(0)?.toUpperCase() ?? "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function PostAuthorName({ authorId }: { authorId: string }) {
  const { data: profile } = useGetUserProfile(authorId);
  const navigate = useNavigate();

  return (
    <span
      className="font-semibold text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
      onClick={() =>
        navigate({ to: "/users/$userId", params: { userId: authorId } })
      }
    >
      {profile?.username ?? profile?.name ?? "Unknown"}
    </span>
  );
}

// ─── Comment Author ───────────────────────────────────────────────────────────
function CommentAuthorAvatar({ userId }: { userId: string }) {
  const { data: profile } = useGetUserProfile(userId);
  const navigate = useNavigate();
  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;

  return (
    <Avatar
      className="w-7 h-7 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
      onClick={() =>
        navigate({ to: "/users/$userId", params: { userId: userId } })
      }
    >
      {avatarUrl && <AvatarImage src={avatarUrl} />}
      <AvatarFallback className="bg-primary/10 text-primary text-xs">
        {profile?.name?.charAt(0)?.toUpperCase() ?? "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function CommentAuthorName({ userId }: { userId: string }) {
  const { data: profile } = useGetUserProfile(userId);
  const navigate = useNavigate();

  return (
    <span
      className="font-semibold text-xs cursor-pointer hover:text-primary transition-colors"
      onClick={() =>
        navigate({ to: "/users/$userId", params: { userId: userId } })
      }
    >
      {profile?.username ?? profile?.name ?? "Unknown"}
    </span>
  );
}

// ─── Post Interactions Bar ────────────────────────────────────────────────────
function PostInteractionsBar({
  post,
  onComment,
}: {
  post: Post;
  onComment: () => void;
}) {
  const { data: interactions, isLoading } = useGetPostInteractions(post.id);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const savePost = useSavePost();
  const unsavePost = useUnsavePost();
  const { identity } = useInternetIdentity();
  const { data: savedPosts } = useGetSavedPosts();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(() => false);

  useEffect(() => {
    if (savedPosts) {
      setSaved(savedPosts.some((p) => p.id === post.id));
    }
  }, [savedPosts, post.id]);

  const handleLike = async () => {
    if (!identity) return;
    if (liked) {
      setLiked(false);
      await unlikePost.mutateAsync(post.id);
    } else {
      setLiked(true);
      await likePost.mutateAsync(post.id);
    }
  };

  const handleSave = async () => {
    if (!identity) return;
    if (saved) {
      setSaved(false);
      await unsavePost.mutateAsync(post.id);
    } else {
      setSaved(true);
      await savePost.mutateAsync(post.id);
    }
  };

  const viewCount = interactions ? Number(interactions.forwards) : 0;

  return (
    <div className="flex items-center gap-4 pt-2 border-t border-border/40">
      <button
        onClick={handleLike}
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
        }`}
      >
        <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
        <span>{isLoading ? "…" : Number(interactions?.likes ?? 0)}</span>
      </button>

      <button
        onClick={onComment}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{isLoading ? "…" : Number(interactions?.comments ?? 0)}</span>
      </button>

      <button
        onClick={handleSave}
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          saved
            ? "text-amber-500"
            : "text-muted-foreground hover:text-amber-500"
        }`}
      >
        <Bookmark className={`w-4 h-4 ${saved ? "fill-amber-500" : ""}`} />
        <span>{isLoading ? "…" : Number(interactions?.saves ?? 0)}</span>
      </button>

      {/* View count */}
      <span
        className="flex items-center gap-1 text-xs text-muted-foreground ml-auto"
        data-ocid="post-view-count"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>{isLoading ? "…" : viewCount}</span>
      </span>
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({
  post,
  open,
  onClose,
}: {
  post: Post;
  open: boolean;
  onClose: () => void;
}) {
  const { data: comments, isLoading } = useGetPostComments(post.id);
  const commentOnPost = useCommentOnPost();
  const deleteComment = useDeleteComment();
  const { identity } = useInternetIdentity();
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (!text.trim() || commentOnPost.isPending) return;
    await commentOnPost.mutateAsync({
      postId: post.id,
      comment: text.trim(),
      parentCommentId: null,
    });
    setText("");
  };

  const callerPrincipal = identity?.getPrincipal().toString();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}
          {!isLoading && (!comments || comments.length === 0) && (
            <p className="text-center text-muted-foreground text-sm py-6">
              No comments yet. Be the first!
            </p>
          )}
          {comments?.map((c: CommentInteraction) => (
            <div key={String(c.id)} className="flex gap-2 items-start">
              <CommentAuthorAvatar userId={c.user.toString()} />
              <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between">
                  <CommentAuthorName userId={c.user.toString()} />
                  {callerPrincipal === c.user.toString() && (
                    <button
                      onClick={() =>
                        deleteComment.mutateAsync({
                          postId: post.id,
                          commentId: c.id,
                        })
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-0.5">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border/40">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1"
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSubmit()
            }
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!text.trim() || commentOnPost.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {commentOnPost.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single Post Card ─────────────────────────────────────────────────────────
function PostCard({
  post,
  pinned = false,
}: {
  post: Post;
  pinned?: boolean;
}) {
  const { identity } = useInternetIdentity();
  const deletePost = useDeletePost();
  const [showComments, setShowComments] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const editPost = useEditPost();

  const callerPrincipal = identity?.getPrincipal().toString();
  const isOwner = callerPrincipal === post.author.toString();

  const imageUrl = post.image ? post.image.getDirectURL() : null;

  // Parse embed from content
  const { text: postText, embedUrl } = parseEmbed(post.content);

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id);
  };

  const handleEdit = async () => {
    await editPost.mutateAsync({
      postId: post.id,
      content: editContent,
      image: post.image ?? null,
    });
    setEditMode(false);
  };

  const formattedDate = new Date(
    Number(post.timestamp) / 1_000_000,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <PostAuthorAvatar authorId={post.author.toString()} />
          <div>
            <PostAuthorName authorId={post.author.toString()} />
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pinned && (
            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setEditMode(!editMode)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePost.isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {deletePost.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {editMode ? (
        <div className="space-y-2 mb-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleEdit}
              disabled={editPost.isPending}
            >
              {editPost.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {postText && (
            <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">
              {postText}
            </p>
          )}
          {/* Embed */}
          {embedUrl && <EmbedRenderer embedUrl={embedUrl} />}
        </>
      )}

      {/* Image */}
      {imageUrl && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img
            src={imageUrl}
            alt="Post"
            className="w-full object-cover max-h-80"
          />
        </div>
      )}

      {/* Interactions */}
      <PostInteractionsBar
        post={post}
        onComment={() => setShowComments(true)}
      />

      {/* Comments Modal */}
      <CommentsModal
        post={post}
        open={showComments}
        onClose={() => setShowComments(false)}
      />
    </article>
  );
}

// ─── Create Post Form ─────────────────────────────────────────────────────────
function CreatePostForm() {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const { data: profile } = useGetCallerUserProfile();

  const handleEmbedCodeChange = (code: string) => {
    setEmbedCode(code);
    const extracted = extractEmbedSrcFromCode(code);
    setEmbedUrl(extracted);
  };

  const handleRemoveEmbed = () => {
    setEmbedCode("");
    setEmbedUrl(null);
    setShowEmbedInput(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const hasContent = content.trim() || imageFile || embedUrl;
    if (!hasContent) return;
    setUploading(true);
    try {
      let imageBlob: ExternalBlob | null = null;
      if (imageFile) {
        const bytes = new Uint8Array(await imageFile.arrayBuffer());
        imageBlob = ExternalBlob.fromBytes(bytes);
      }
      // Encode embed URL into content using our prefix format
      const finalContent = embedUrl
        ? `${content.trim()}${content.trim() ? "\n" : ""}${encodeEmbed(embedUrl)}`
        : content.trim();
      await createPost.mutateAsync({
        content: finalContent,
        image: imageBlob,
      });
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setEmbedCode("");
      setEmbedUrl(null);
      setShowEmbedInput(false);
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;

  const embedType = embedUrl ? detectEmbedType(embedUrl) : null;
  const embedTypeLabel =
    embedType === "youtube"
      ? "YouTube"
      : embedType === "x"
        ? "X (Twitter)"
        : embedType === "tiktok"
          ? "TikTok"
          : embedUrl
            ? "Embed"
            : null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 ring-2 ring-primary/20">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {profile?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community…"
            className="min-h-[80px] resize-none border-border/50 focus:border-primary/50"
          />

          {/* Embed input panel */}
          {showEmbedInput && (
            <div className="space-y-2 p-3 bg-muted/40 rounded-xl border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  Paste YouTube, X, or TikTok embed code
                </span>
                <button
                  type="button"
                  onClick={handleRemoveEmbed}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove embed"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                value={embedCode}
                onChange={(e) => handleEmbedCodeChange(e.target.value)}
                placeholder='Paste embed code here, e.g. <iframe src="...">'
                className="min-h-[70px] resize-none text-xs font-mono border-border/50"
                data-ocid="embed-code-input"
              />
              {embedUrl && embedTypeLabel && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>{embedTypeLabel} embed detected</span>
                </div>
              )}
              {embedCode && !embedUrl && (
                <p className="text-xs text-destructive">
                  Could not extract embed URL. Make sure you paste the full
                  embed code.
                </p>
              )}
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-40 rounded-xl object-cover"
              />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEmbedInput((v) => !v)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  showEmbedInput
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
                data-ocid="embed-toggle-btn"
              >
                <Code2 className="w-4 h-4" />
                <span>Embed</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                (!content.trim() && !imageFile && !embedUrl) ||
                uploading ||
                createPost.isPending
              }
              className="bg-primary hover:bg-primary/90"
            >
              {uploading || createPost.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View More Button ─────────────────────────────────────────────────────────
function ViewMoreButton({
  visible,
  total,
  onViewMore,
}: {
  visible: number;
  total: number;
  onViewMore: () => void;
}) {
  if (visible >= total) return null;
  const remaining = total - visible;
  return (
    <div className="flex flex-col items-center gap-1 pt-2">
      <Button
        variant="outline"
        onClick={onViewMore}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60 transition-all"
      >
        <ChevronDown className="w-4 h-4" />
        View More
        <span className="text-xs text-muted-foreground ml-1">
          ({remaining} remaining)
        </span>
      </Button>
    </div>
  );
}

// ─── Posts Page ───────────────────────────────────────────────────────────────
export default function PostsPage() {
  const [activeTab, setActiveTab] = useState("all");

  // Per-tab visible counts, reset to PAGE_SIZE when tab changes
  const [allVisible, setAllVisible] = useState(PAGE_SIZE);
  const [followedVisible, setFollowedVisible] = useState(PAGE_SIZE);
  const [myVisible, setMyVisible] = useState(PAGE_SIZE);
  const [savedVisible, setSavedVisible] = useState(PAGE_SIZE);

  // Reset visible count only for the newly activated tab
  useEffect(() => {
    if (activeTab === "all") setAllVisible(PAGE_SIZE);
    else if (activeTab === "followed") setFollowedVisible(PAGE_SIZE);
    else if (activeTab === "my") setMyVisible(PAGE_SIZE);
    else if (activeTab === "saved") setSavedVisible(PAGE_SIZE);
  }, [activeTab]);

  const { data: allPosts, isLoading: allLoading } = useGetPosts();
  const { data: followedPosts, isLoading: followedLoading } =
    useGetPostsFromFollowedUsers();
  const { data: myPosts, isLoading: myLoading } = useGetCallerPosts();
  const { data: savedPosts, isLoading: savedLoading } = useGetSavedPosts();
  const { data: pinnedPost } = useGetPinnedTrendingPost();

  // Sort all posts newest-first
  const sortedAllPosts = [...(allPosts ?? [])].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const sortedFollowedPosts = [...(followedPosts ?? [])].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const sortedMyPosts = [...(myPosts ?? [])].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const sortedSavedPosts = [...(savedPosts ?? [])].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );

  // Sliced arrays for display
  const visibleAllPosts = sortedAllPosts.slice(0, allVisible);
  const visibleFollowedPosts = sortedFollowedPosts.slice(0, followedVisible);
  const visibleMyPosts = sortedMyPosts.slice(0, myVisible);
  const visibleSavedPosts = sortedSavedPosts.slice(0, savedVisible);

  const renderSkeletons = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card border border-border/50 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Discover and share with the community
          </p>
        </div>

        {/* Create Post */}
        <CreatePostForm />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg text-xs font-medium">
              New
            </TabsTrigger>
            <TabsTrigger
              value="followed"
              className="rounded-lg text-xs font-medium"
            >
              Following
            </TabsTrigger>
            <TabsTrigger value="my" className="rounded-lg text-xs font-medium">
              My Posts
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-lg text-xs font-medium"
            >
              Saved
            </TabsTrigger>
          </TabsList>

          {/* ── All Posts Tab ── */}
          <TabsContent value="all" className="mt-4 space-y-4">
            {allLoading ? (
              renderSkeletons()
            ) : sortedAllPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No posts yet. Be the first to share!</p>
              </div>
            ) : (
              <>
                {/* Pinned post at top */}
                {pinnedPost && (
                  <PostCard
                    key={`pinned-${pinnedPost.id}`}
                    post={pinnedPost}
                    pinned
                  />
                )}
                {/* Visible posts (excluding pinned if it appears in the list) */}
                {visibleAllPosts
                  .filter((p) => p.id !== pinnedPost?.id)
                  .map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                <ViewMoreButton
                  visible={allVisible}
                  total={sortedAllPosts.length}
                  onViewMore={() => setAllVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
          </TabsContent>

          {/* ── Followed Posts Tab ── */}
          <TabsContent value="followed" className="mt-4 space-y-4">
            {followedLoading ? (
              renderSkeletons()
            ) : sortedFollowedPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No posts from people you follow yet.</p>
                <p className="text-xs mt-1">
                  Follow users to see their posts here.
                </p>
              </div>
            ) : (
              <>
                {visibleFollowedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                <ViewMoreButton
                  visible={followedVisible}
                  total={sortedFollowedPosts.length}
                  onViewMore={() => setFollowedVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
          </TabsContent>

          {/* ── My Posts Tab ── */}
          <TabsContent value="my" className="mt-4 space-y-4">
            {myLoading ? (
              renderSkeletons()
            ) : sortedMyPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">You haven't posted anything yet.</p>
              </div>
            ) : (
              <>
                {visibleMyPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                <ViewMoreButton
                  visible={myVisible}
                  total={sortedMyPosts.length}
                  onViewMore={() => setMyVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
          </TabsContent>

          {/* ── Saved Posts Tab ── */}
          <TabsContent value="saved" className="mt-4 space-y-4">
            {savedLoading ? (
              renderSkeletons()
            ) : sortedSavedPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No saved posts yet.</p>
                <p className="text-xs mt-1">
                  Bookmark posts to find them here later.
                </p>
              </div>
            ) : (
              <>
                {visibleSavedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                <ViewMoreButton
                  visible={savedVisible}
                  total={sortedSavedPosts.length}
                  onViewMore={() => setSavedVisible((v) => v + PAGE_SIZE)}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
