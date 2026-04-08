import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  DollarSign,
  Heart,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { NotificationType } from "../backend";
import {
  useDeleteNotification,
  useGetNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from "../hooks/useQueries";

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useGetNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const [activeTab, setActiveTab] = useState("all");

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.message:
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case NotificationType.like:
        return <Heart className="h-4 w-4 text-rose-500" />;
      case NotificationType.comment:
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case NotificationType.follow:
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case NotificationType.roseGift:
      case NotificationType.postGift:
      case NotificationType.roseReceipt:
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      case NotificationType.tradeRequest:
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      case NotificationType.systemNotice:
        return <Bell className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.id);
    }

    if (notification.linkedType && notification.linkedId) {
      if (notification.linkedType === "conversation") {
        navigate({ to: `/chats/${notification.linkedId}` });
      } else if (notification.linkedType === "post") {
        navigate({ to: "/posts" });
      }
    }

    onClose();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: bigint) => {
    e.stopPropagation();
    await deleteNotification.mutateAsync(notificationId);
  };

  const filterNotifications = (type: string) => {
    if (type === "all") return notifications;
    if (type === "messages") {
      return notifications.filter(
        (n) => n.notificationType === NotificationType.message,
      );
    }
    if (type === "social") {
      return notifications.filter(
        (n) =>
          n.notificationType === NotificationType.like ||
          n.notificationType === NotificationType.comment ||
          n.notificationType === NotificationType.follow ||
          n.notificationType === NotificationType.postGift,
      );
    }
    if (type === "system") {
      return notifications.filter(
        (n) =>
          n.notificationType === NotificationType.systemNotice ||
          n.notificationType === NotificationType.tradeRequest ||
          n.notificationType === NotificationType.roseGift ||
          n.notificationType === NotificationType.roseReceipt,
      );
    }
    return notifications;
  };

  const filteredNotifications = filterNotifications(activeTab);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 md:bg-transparent animate-fade-in"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="absolute right-0 top-14 sm:top-16 w-full md:w-96 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] md:h-[600px] md:right-4 md:top-20 bg-background/95 backdrop-blur-md border-l md:border md:rounded-2xl shadow-romantic flex flex-col animate-slide-down"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between p-4 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <Badge variant="default" className="rounded-full rose-gradient">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllAsRead.isPending}
                className="text-xs rounded-full hover:bg-primary/10"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-primary/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b border-primary/10 bg-transparent">
            <TabsTrigger
              value="all"
              className="text-xs sm:text-sm rounded-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="text-xs sm:text-sm rounded-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Messages
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="text-xs sm:text-sm rounded-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Social
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="text-xs sm:text-sm rounded-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 m-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">
                    Loading notifications...
                  </p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 px-4">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id.toString()}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleNotificationClick(notification);
                      }}
                      role="button"
                      tabIndex={0}
                      className={`p-4 hover:bg-primary/5 cursor-pointer transition-all ${
                        !notification.isRead
                          ? "bg-primary/10 border-l-4 border-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-1 p-2 rounded-full bg-primary/10">
                          {getNotificationIcon(notification.notificationType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${!notification.isRead ? "font-semibold" : ""}`}
                          >
                            {notification.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="h-6 w-6 shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
