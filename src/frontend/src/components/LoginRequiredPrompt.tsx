import { Button } from "@/components/ui/button";
import { Heart, RefreshCw } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginRequiredPrompt() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-rose-950/20 dark:via-pink-950/20 dark:to-purple-950/20 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-rose-400/20 to-pink-400/20 rounded-3xl blur-2xl opacity-60 animate-pulse" />

        <div className="relative bg-card/95 backdrop-blur-md rounded-3xl shadow-romantic border border-primary/20 p-8 sm:p-10">
          {/* Refresh Icon - Top Right Corner */}
          <a
            href="https://rosa-rht.caffeine.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 hover:from-rose-200 hover:to-pink-200 dark:hover:from-rose-800/40 dark:hover:to-pink-800/40 transition-all duration-300 hover:shadow-rose-glow hover:scale-110 group"
            aria-label="Refresh application"
          >
            <RefreshCw className="h-5 w-5 text-rose-600 dark:text-rose-400 group-hover:rotate-180 transition-transform duration-500" />
          </a>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-rose-400 to-pink-400 rounded-full blur-xl opacity-50 animate-pulse" />
              <img
                src="https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3Aa4171439c929fca259479ac099c5abbadb81b20419a78a74a725b6efa4dfb071&owner_id=dpef4-uyaaa-aaaam-qfjxq-cai&project_id=019a191f-6c11-7484-a973-622c2b7c0b12"
                alt="Rose Dating Logo"
                className="relative h-24 w-24 sm:h-32 sm:w-32 drop-shadow-2xl object-contain"
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-rose-500 to-pink-500 bg-clip-text text-transparent">
                Welcome to Rose Dating
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Connect with others, share moments, and find meaningful
                connections
              </p>
            </div>

            <div className="w-full space-y-4 pt-4">
              <Button
                onClick={login}
                disabled={isLoggingIn}
                size="lg"
                className="w-full rounded-full rose-gradient text-white font-semibold shadow-rose-glow hover:shadow-rose-glow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed h-12 sm:h-14 text-base sm:text-lg"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Logging in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Login to Continue
                  </span>
                )}
              </Button>

              <p className="text-xs sm:text-sm text-muted-foreground">
                Please log in to access the app and start your journey
              </p>
            </div>

            <div className="pt-6 border-t border-border/50 w-full">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                © 2025. Built with{" "}
                <Heart className="h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" />{" "}
                using{" "}
                <a
                  href="https://caffeine.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors underline"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
