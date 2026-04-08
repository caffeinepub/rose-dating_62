import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import BottomNav from "./BottomNav";
import LoginRequiredPrompt from "./LoginRequiredPrompt";
import PWAInstallPrompt from "./PWAInstallPrompt";
import ProfileSetupModal from "./ProfileSetupModal";
import TopNav from "./TopNav";

export default function Layout() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const navigate = useNavigate();

  const isAuthenticated = !!identity;

  // Handle QR code scanning flow - navigate to chat after login and profile setup
  useEffect(() => {
    const qrTargetUsername = sessionStorage.getItem("qr_target_username");

    if (qrTargetUsername && isAuthenticated && userProfile && !profileLoading) {
      // User is logged in and has profile, navigate to chat with target user
      sessionStorage.removeItem("qr_target_username");

      // Navigate to users page with QR username parameter to trigger chat
      navigate({
        to: "/users",
        search: { qr_username: qrTargetUsername },
      });
    }
  }, [isAuthenticated, userProfile, profileLoading, navigate]);

  // Show profile setup modal for new users
  useEffect(() => {
    if (
      isAuthenticated &&
      !profileLoading &&
      isFetched &&
      userProfile === null
    ) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading Rose Dating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginRequiredPrompt />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pb-20 pt-16">
        <Outlet />
      </main>
      <BottomNav />
      <PWAInstallPrompt />
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}
