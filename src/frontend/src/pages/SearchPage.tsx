import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileText, MessageSquare, User } from "lucide-react";
import { useUniversalSearch } from "../hooks/useQueries";

export default function SearchPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/search" });
  const searchQuery = (searchParams as any)?.q || "";

  const { data: results = [], isLoading } = useUniversalSearch(searchQuery);

  const userResults = results.filter((r) => r.__kind__ === "userResult");
  const messageResults = results.filter((r) => r.__kind__ === "messageResult");
  const postResults = results.filter((r) => r.__kind__ === "postResult");

  if (!searchQuery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          <p>Enter a search term to find users, messages, and posts.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          Search Results for "{searchQuery}"
        </h1>
        <div className="text-center text-muted-foreground py-12">
          <p>No results found for "{searchQuery}"</p>
          <p className="text-sm mt-2">
            Try different keywords or check your spelling
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Search Results for "{searchQuery}"</h1>

      {userResults.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Users ({userResults.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userResults.map((result) => {
              if (result.__kind__ !== "userResult") return null;
              const { principal, profile, balance } = result.userResult;

              return (
                <Card
                  key={principal.toString()}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() =>
                    navigate({ to: `/users/${principal.toString()}` })
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage
                          src={profile.profilePicture?.getDirectURL()}
                          alt={profile.name}
                        />
                        <AvatarFallback>
                          {profile.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.country}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-sm font-medium text-primary">
                          {balance.toFixed(4)} 🌹
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {messageResults.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Messages ({messageResults.length})
            </h2>
          </div>
          <div className="space-y-3">
            {messageResults.map((result) => {
              if (result.__kind__ !== "messageResult") return null;
              const {
                conversationId,
                messageId,
                contentSnippet,
                senderProfile,
                timestamp,
              } = result.messageResult;

              return (
                <Card
                  key={`${conversationId}-${messageId}`}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() =>
                    navigate({ to: `/chats/${conversationId.toString()}` })
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage
                          src={senderProfile?.profilePicture?.getDirectURL()}
                          alt={senderProfile?.name || "User"}
                        />
                        <AvatarFallback>
                          {senderProfile?.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">
                            {senderProfile?.name || "Unknown User"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              Number(timestamp) / 1000000,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {contentSnippet}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {postResults.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              Posts ({postResults.length})
            </h2>
          </div>
          <div className="space-y-3">
            {postResults.map((result) => {
              if (result.__kind__ !== "postResult") return null;
              const { postId, contentSnippet, image, timestamp } =
                result.postResult;

              return (
                <Card
                  key={postId}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate({ to: "/posts" })}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {image && (
                        <img
                          src={image.getDirectURL()}
                          alt="Post"
                          className="h-16 w-16 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              Number(timestamp) / 1000000,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-3">{contentSnippet}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
