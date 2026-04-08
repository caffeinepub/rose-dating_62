import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import { Edit, Search, Trash2, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAdminDeleteUser,
  useAdminUpdateUserProfile,
  useGetAllUserProfiles,
  useGetCallerUserProfile,
} from "../hooks/useQueries";

export default function AdminUserManagementPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const { data: allUsers, isLoading: usersLoading } = useGetAllUserProfiles();
  const updateUser = useAdminUpdateUserProfile();
  const deleteUser = useAdminDeleteUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [editingUser, setEditingUser] = useState<{
    principal: Principal;
    profile: UserProfile;
  } | null>(null);
  const [deletingUser, setDeletingUser] = useState<{
    principal: Principal;
    profile: UserProfile;
  } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBirthYear, setEditBirthYear] = useState("");
  const [editBio, setEditBio] = useState("");

  const isAdmin = profile?.username === "rosalia";

  const handleEditClick = (principal: Principal, userProfile: UserProfile) => {
    setEditingUser({ principal, profile: userProfile });
    setEditName(userProfile.name);
    setEditUsername(userProfile.username);
    setEditCountry(userProfile.country);
    setEditGender(userProfile.gender || "");
    setEditBirthYear(
      userProfile.birthYear ? String(Number(userProfile.birthYear)) : "",
    );
    setEditBio(userProfile.bio || "");
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditName("");
    setEditUsername("");
    setEditCountry("");
    setEditGender("");
    setEditBirthYear("");
    setEditBio("");
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    if (!editName.trim() || !editUsername.trim() || !editCountry.trim()) {
      toast.error(
        "Please fill in all required fields (name, username, and country)",
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(editUsername.trim())) {
      toast.error(
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    let birthYearNum: bigint | undefined = undefined;
    if (editBirthYear.trim()) {
      const year = Number.parseInt(editBirthYear);
      const currentYear = new Date().getFullYear();
      if (Number.isNaN(year) || year < 1900 || year > currentYear - 18) {
        toast.error(
          "Please enter a valid birth year (must be at least 18 years old)",
        );
        return;
      }
      birthYearNum = BigInt(year);
    }

    try {
      await updateUser.mutateAsync({
        principal: editingUser.principal,
        profile: {
          name: editName.trim(),
          username: editUsername.trim(),
          country: editCountry.trim(),
          gender: editGender.trim() || undefined,
          birthYear: birthYearNum,
          bio: editBio.trim() || undefined,
          profilePicture: editingUser.profile.profilePicture,
        },
      });

      toast.success("User profile updated successfully!");
      handleCancelEdit();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user profile");
      console.error(error);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await deleteUser.mutateAsync(deletingUser.principal);
      toast.success("User deleted successfully");
      setDeletingUser(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
      console.error(error);
    }
  };

  const filteredUsers =
    allUsers?.filter(([principal, userProfile]) => {
      const matchesSearch =
        userProfile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userProfile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        principal.toString().toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCountry =
        !filterCountry ||
        userProfile.country.toLowerCase().includes(filterCountry.toLowerCase());

      return matchesSearch && matchesCountry;
    }) || [];

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
            Please log in to access admin user management
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="container max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
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

  return (
    <div className="container max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/admin-user-management-icon-transparent.dim_24x24.png"
            alt="Admin"
            className="h-8 w-8"
          />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-rose-500 to-pink-500 bg-clip-text text-transparent">
            User Management
          </h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage all registered users on the platform
        </p>
      </div>

      <Card className="mb-6 card-romantic">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm">
                Search by Name or Username
              </Label>
              <Input
                id="search"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-country" className="text-sm">
                Filter by Country
              </Label>
              <Input
                id="filter-country"
                placeholder="Enter country..."
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Users: {allUsers?.length || 0}</span>
            <span>Filtered Results: {filteredUsers.length}</span>
          </div>
        </CardContent>
      </Card>

      {usersLoading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="card-romantic">
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No users found matching your criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map(([principal, userProfile]) => (
            <Card
              key={principal.toString()}
              className="card-romantic hover:shadow-rose-glow transition-all duration-300"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    {userProfile.profilePicture ? (
                      <AvatarImage
                        src={userProfile.profilePicture.getDirectURL()}
                      />
                    ) : null}
                    <AvatarFallback className="text-xl">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="font-semibold text-lg truncate">
                        {userProfile.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        @{userProfile.username}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Country:</span>
                        <span className="ml-2 font-medium">
                          {userProfile.country}
                        </span>
                      </div>
                      {userProfile.gender && (
                        <div>
                          <span className="text-muted-foreground">Gender:</span>
                          <span className="ml-2 font-medium">
                            {userProfile.gender}
                          </span>
                        </div>
                      )}
                      {userProfile.birthYear && (
                        <div>
                          <span className="text-muted-foreground">
                            Birth Year:
                          </span>
                          <span className="ml-2 font-medium">
                            {Number(userProfile.birthYear)}
                          </span>
                        </div>
                      )}
                    </div>

                    {userProfile.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {userProfile.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(principal, userProfile)}
                        className="rose-gradient-border"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setDeletingUser({ principal, profile: userProfile })
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Edit User Profile
              </DialogTitle>
              <DialogDescription>
                Update user information. All changes will be saved to the
                blockchain.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm">
                  Name *
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-sm">
                  Username *
                </Label>
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-country" className="text-sm">
                  Country *
                </Label>
                <Input
                  id="edit-country"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="Country"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gender" className="text-sm">
                  Gender
                </Label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Select gender (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-birthYear" className="text-sm">
                  Birth Year
                </Label>
                <Input
                  id="edit-birthYear"
                  type="number"
                  value={editBirthYear}
                  onChange={(e) => setEditBirthYear(e.target.value)}
                  placeholder="e.g., 1990"
                  min="1900"
                  max={new Date().getFullYear() - 18}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bio" className="text-sm">
                  Bio
                </Label>
                <Textarea
                  id="edit-bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="User bio..."
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUser.isPending}
                className="rose-gradient"
              >
                {updateUser.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent className="w-[95vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the
              user account for <strong>{deletingUser?.profile.name}</strong> (@
              {deletingUser?.profile.username}) and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
