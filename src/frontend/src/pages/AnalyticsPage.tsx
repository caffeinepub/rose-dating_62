import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  DollarSign,
  Heart,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import type { NotificationCount } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetNotificationCountByType,
} from "../hooks/useQueries";

export default function AnalyticsPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const { data: notificationStats, isLoading: statsLoading } =
    useGetNotificationCountByType();

  const isAdmin = profile?.username === "rosalia";

  // Helper to safely read a bigint field from notification stats
  const stat = (field: keyof NotificationCount): number => {
    if (!notificationStats) return 0;
    const val = notificationStats[field];
    return Number(val ?? 0n);
  };

  if (!identity) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md card-romantic">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Please log in to access analytics
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="container max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md card-romantic">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This page is only accessible to administrators
            </p>
            <Button
              onClick={() => navigate({ to: "/" })}
              className="rose-gradient"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: "N/A",
      description: "Registered users on the platform",
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Messages Sent",
      value: stat("messageCount").toLocaleString(),
      description: "Total messages exchanged",
      icon: MessageSquare,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Post Interactions",
      value: (stat("likeCount") + stat("commentCount")).toLocaleString(),
      description: "Likes and comments on posts",
      icon: Heart,
      gradient: "from-rose-500 to-pink-500",
    },
    {
      title: "Rose Gifts",
      value: (stat("roseGiftCount") + stat("postGiftCount")).toLocaleString(),
      description: "Total Rose gifts sent",
      icon: DollarSign,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "New Follows",
      value: stat("followCount").toLocaleString(),
      description: "User follow interactions",
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: "Platform Activity",
      value: stat("totalCount").toLocaleString(),
      description: "Total platform interactions",
      icon: Activity,
      gradient: "from-indigo-500 to-purple-500",
    },
  ];

  return (
    <div className="container max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-rose-500 to-pink-500 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Platform insights and user engagement metrics
        </p>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, index) => {
            const Icon = s.icon;
            return (
              <Card
                key={index}
                className="card-romantic hover:shadow-rose-glow transition-all duration-300"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.title}
                  </CardTitle>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${s.gradient} bg-opacity-10`}
                  >
                    <Icon
                      className={`h-4 w-4 bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6 card-romantic">
        <CardHeader>
          <CardTitle className="text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Engagement Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Group Messages</span>
                <span className="font-semibold">
                  {stat("groupMessageCount").toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Story Views</span>
                <span className="font-semibold">
                  {stat("storyViewCount").toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trade Requests</span>
                <span className="font-semibold">
                  {stat("tradeRequestCount").toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Group Additions</span>
                <span className="font-semibold">
                  {stat("groupAddCount").toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rose Receipts</span>
                <span className="font-semibold">
                  {stat("roseReceiptCount").toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">System Notices</span>
                <span className="font-semibold">
                  {stat("systemCount").toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-rose-400/10 to-pink-400/10 border border-primary/20">
        <p className="text-sm text-muted-foreground text-center">
          <strong className="text-foreground">Note:</strong> Analytics data is
          based on notification events and platform interactions. Some metrics
          may be limited by available backend data.
        </p>
      </div>
    </div>
  );
}
