import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isPWAInstalled, promptInstall } from "@/lib/pwa";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isPWAInstalled());

    // Listen for install availability
    const handleInstallAvailable = () => {
      if (!isPWAInstalled()) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("pwa-install-available", handleInstallAvailable);

    return () => {
      window.removeEventListener(
        "pwa-install-available",
        handleInstallAvailable,
      );
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed or dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = Number.parseInt(dismissed);
      const daysSinceDismissed =
        (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:max-w-md animate-slide-up">
      <Card className="card-romantic border-2 border-primary/20">
        <CardHeader className="relative pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 rounded-full hover:bg-primary/10"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Install Rose Dating
          </CardTitle>
          <CardDescription>
            Add Rose Dating to your home screen for a better experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Quick access from your home screen</li>
            <li>• Works offline with cached content</li>
            <li>• Native app-like experience</li>
          </ul>
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 rose-gradient hover:opacity-90 transition-opacity"
            >
              Install App
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              Not Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
