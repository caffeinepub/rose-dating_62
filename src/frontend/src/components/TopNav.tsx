import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { useGetUnreadNotificationCount } from "../hooks/useQueries";
import NotificationPanel from "./NotificationPanel";
import QRCodeModal from "./QRCodeModal";

export default function TopNav() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: unreadCount = 0n } = useGetUnreadNotificationCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/search", search: { q: searchQuery.trim() } });
    }
  };

  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-romantic">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6 gap-2 sm:gap-3">
          {/* Logo */}
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center shrink-0 transition-transform hover:scale-105"
          >
            <img
              src="https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3Aa4171439c929fca259479ac099c5abbadb81b20419a78a74a725b6efa4dfb071&owner_id=dpef4-uyaaa-aaaam-qfjxq-cai&project_id=019a191f-6c11-7484-a973-622c2b7c0b12"
              alt="Rose Dating Logo"
              className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-lg object-contain"
            />
          </button>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md mx-2 sm:mx-4"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, messages, posts..."
                className="w-full h-9 sm:h-10 pl-9 sm:pl-10 pr-3 sm:pr-4 rounded-full border border-primary/20 bg-background/50 hover:border-primary/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground/60"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            </div>
          </form>

          {/* Right Side Icons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* QR Code Button */}
            <button
              onClick={() => setShowQRModal(true)}
              className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-all hover:shadow-rose-glow-sm"
              title="QR Code"
            >
              <img
                src="/assets/generated/qr-code-icon-transparent.dim_24x24.png"
                alt="QR Code"
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
            </button>

            {/* Notification Button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-all hover:shadow-rose-glow-sm relative"
            >
              <img
                src="/assets/generated/notification-icon.dim_24x24.png"
                alt="Notifications"
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
              {Number(unreadCount) > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs rounded-full rose-gradient animate-pulse"
                >
                  {Number(unreadCount) > 99 ? "99+" : Number(unreadCount)}
                </Badge>
              )}
            </button>

            {/* Profile Button */}
            <button
              onClick={() => navigate({ to: "/profile" })}
              className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-all hover:shadow-rose-glow-sm"
              title="My Profile"
            >
              <img
                src="/assets/generated/profile-icon.dim_24x24.png"
                alt="Me"
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
            </button>
          </div>
        </div>
      </header>

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
      <QRCodeModal open={showQRModal} onClose={() => setShowQRModal(false)} />
    </>
  );
}
