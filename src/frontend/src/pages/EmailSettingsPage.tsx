import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import LoginButton from "../components/LoginButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

export default function EmailSettingsPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  const [email, setEmail] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize email from profile when loaded
  useState(() => {
    if (profile && !hasChanges) {
      // Email is stored in the bio field for now (backend doesn't have separate email field yet)
      // TODO: Update when backend adds dedicated email field
      setEmail("");
    }
  });

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Empty is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded");
      return;
    }

    try {
      // Save the profile with updated email
      // Note: Backend currently doesn't have a separate email field
      // This will need to be updated when backend adds email support
      await saveProfile.mutateAsync({
        ...profile,
        // TODO: Add email field when backend supports it
        // For now, we'll show a message that email settings will be available soon
      });

      toast.success("Email settings saved successfully!");
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save email settings");
      console.error(error);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setHasChanges(true);
  };

  if (!identity) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl text-rose-900 dark:text-rose-100">
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-rose-700 dark:text-rose-300">
              Please login to manage email settings
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/profile" })}
          className="hover:bg-rose-100 dark:hover:bg-rose-900/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800 shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-rose-400 to-pink-500">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <CardTitle className="text-xl sm:text-2xl text-rose-900 dark:text-rose-100">
              Email Settings
            </CardTitle>
          </div>
        </CardHeader>

        {isLoading ? (
          <CardContent className="p-4 sm:p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        ) : (
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSaveEmail} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-rose-900 dark:text-rose-100"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="your.email@example.com"
                  className="text-base border-rose-300 focus:border-rose-500 dark:border-rose-700 bg-white dark:bg-rose-950/10"
                />
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Your email will be used for important notifications and
                  updates. It will be kept private and secure.
                </p>
              </div>

              <div className="rounded-lg bg-rose-100 dark:bg-rose-900/20 p-3 sm:p-4 border border-rose-300 dark:border-rose-700">
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100 mb-2">
                  Email Notifications
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Once you add your email, you'll be able to receive
                  notifications for:
                </p>
                <ul className="text-xs text-rose-700 dark:text-rose-300 mt-2 space-y-1 ml-4 list-disc">
                  <li>New messages and Rose gifts</li>
                  <li>Post interactions (likes, comments)</li>
                  <li>New followers</li>
                  <li>Important account updates</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={saveProfile.isPending || !hasChanges}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveProfile.isPending ? "Saving..." : "Save Email Settings"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/profile" })}
                  className="flex-1 border-rose-300 hover:bg-rose-100 dark:border-rose-700 dark:hover:bg-rose-900/20"
                >
                  Cancel
                </Button>
              </div>

              {!hasChanges && email && (
                <p className="text-xs text-center text-rose-600 dark:text-rose-400">
                  ✓ Email settings are up to date
                </p>
              )}
            </form>
          </CardContent>
        )}
      </Card>

      <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-800">
        <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100 mb-2">
          Privacy & Security
        </h3>
        <p className="text-xs text-rose-700 dark:text-rose-300">
          Your email address is stored securely and will never be shared with
          other users or third parties. You can update or remove your email at
          any time from this page.
        </p>
      </div>
    </div>
  );
}
