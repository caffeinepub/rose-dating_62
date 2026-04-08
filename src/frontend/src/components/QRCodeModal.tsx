import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, QrCode, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { useQRScanner } from "../qr-code/useQRScanner";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ open, onClose }: QRCodeModalProps) {
  const [view, setView] = useState<"menu" | "show" | "scan">("menu");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const { data: userProfile } = useGetCallerUserProfile();
  const { identity } = useInternetIdentity();

  const {
    qrResults,
    isScanning,
    canStartScanning,
    startScanning,
    stopScanning,
    videoRef,
    canvasRef: scannerCanvasRef,
    error,
    isReady,
  } = useQRScanner({
    facingMode: "environment",
    scanInterval: 100,
  });

  // Generate QR code using Google Charts API when showing user's own code
  useEffect(() => {
    if (view === "show" && userProfile) {
      const chatLink = `https://rosedate.net/chat/@${userProfile.username}`;
      const encodedData = encodeURIComponent(chatLink);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&color=e91e63&bgcolor=ffffff`;
      setQrCodeDataUrl(qrUrl);
    }
  }, [view, userProfile]);

  // Handle QR scan results
  useEffect(() => {
    if (qrResults.length > 0) {
      const latestResult = qrResults[0];
      const scannedData = latestResult.data;

      // Check if it's a Rose Dating chat link
      const chatLinkPattern = /rosedate\.net\/chat\/@(.+)/;
      const match = scannedData.match(chatLinkPattern);

      if (match) {
        const username = match[1];
        stopScanning();
        onClose();

        // Store the target username in sessionStorage for post-login/onboarding navigation
        sessionStorage.setItem("qr_target_username", username);

        // If user is authenticated, navigate immediately
        if (identity) {
          // Trigger navigation by reloading or using window location
          window.location.href = `/users?qr_username=${encodeURIComponent(username)}`;
        } else {
          // User needs to log in first - the Layout component will handle navigation after login
          toast.info("Please log in to connect with this user");
          // Reload to trigger login prompt
          window.location.reload();
        }
      } else if (scannedData.includes("rosedate.net")) {
        // External scan - redirect to main site
        window.location.href = "https://rosedate.net";
      } else {
        toast.error("Invalid QR code. Please scan a Rose Dating QR code.");
      }
    }
  }, [qrResults, identity, onClose, stopScanning]);

  const handleClose = () => {
    if (isScanning) {
      stopScanning();
    }
    setView("menu");
    onClose();
  };

  const handleShowQR = () => {
    setView("show");
  };

  const handleScanQR = async () => {
    setView("scan");
    if (canStartScanning) {
      await startScanning();
    }
  };

  const handleBack = () => {
    if (isScanning) {
      stopScanning();
    }
    setView("menu");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rose-gradient-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Code
          </DialogTitle>
          <DialogDescription>
            {view === "menu" &&
              "Share your profile or scan another user's QR code"}
            {view === "show" && "Share this QR code with others to connect"}
            {view === "scan" && "Point your camera at a QR code to scan"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {view === "menu" && (
            <div className="grid gap-3">
              <Button
                onClick={handleShowQR}
                className="w-full h-auto py-6 rose-gradient hover:shadow-rose-glow transition-all"
                disabled={!userProfile}
              >
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-8 w-8" />
                  <span className="text-base font-semibold">
                    Show My QR Code
                  </span>
                  <span className="text-xs opacity-80">
                    Let others scan to connect
                  </span>
                </div>
              </Button>

              <Button
                onClick={handleScanQR}
                variant="outline"
                className="w-full h-auto py-6 border-primary/30 hover:bg-primary/10 hover:shadow-rose-glow-sm transition-all"
                disabled={!isReady}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-base font-semibold">Scan QR Code</span>
                  <span className="text-xs opacity-80">
                    Scan another user's code
                  </span>
                </div>
              </Button>
            </div>
          )}

          {view === "show" && (
            <div className="space-y-4">
              <div className="flex justify-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Your QR Code"
                    className="w-64 h-64 rounded-lg shadow-romantic"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                  </div>
                )}
              </div>

              {userProfile && (
                <div className="text-center space-y-1">
                  <p className="font-semibold text-lg">{userProfile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{userProfile.username}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    rosedate.net/chat/@{userProfile.username}
                  </p>
                </div>
              )}

              <Button onClick={handleBack} variant="outline" className="w-full">
                Back
              </Button>
            </div>
          )}

          {view === "scan" && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={scannerCanvasRef} className="hidden" />

                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  </div>

                  {isScanning && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="animate-pulse text-white bg-black/50 px-4 py-2 rounded-full text-sm">
                        Scanning...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-center text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {error.message}
                </div>
              )}

              {qrResults.length > 0 && (
                <div className="text-center text-sm text-primary bg-primary/10 p-3 rounded-lg">
                  QR Code detected! Processing...
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                {isScanning && (
                  <Button
                    onClick={stopScanning}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
