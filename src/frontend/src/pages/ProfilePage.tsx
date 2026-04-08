import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  Camera,
  Edit,
  MapPin,
  Trash2,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import LoginButton from "../components/LoginButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteCallerProfile,
  useGetCallerUserProfile,
  useGetFollowerCount,
  useGetFollowingCount,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const userPrincipal = identity?.getPrincipal();
  const { data: followerCount } = useGetFollowerCount(
    userPrincipal || (null as any),
  );
  const { data: followingCount } = useGetFollowingCount(
    userPrincipal || (null as any),
  );
  const saveProfile = useSaveCallerUserProfile();
  const deleteProfile = useDeleteCallerProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.username === "rosalia";

  const handleEditClick = () => {
    if (profile) {
      setName(profile.name);
      setUsername(profile.username);
      setCountry(profile.country);
      setGender(profile.gender || "");
      setBirthYear(profile.birthYear ? String(Number(profile.birthYear)) : "");
      setBio(profile.bio || "");
      setAvatarPreview(profile.profilePicture?.getDirectURL() || null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !username.trim() || !country.trim()) {
      toast.error(
        "Please fill in all required fields (name, username, and country)",
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast.error(
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    let birthYearNum: bigint | undefined = undefined;
    if (birthYear.trim()) {
      const year = Number.parseInt(birthYear);
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
      let profilePicture = profile?.profilePicture;

      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        profilePicture = ExternalBlob.fromBytes(uint8Array);
      }

      await saveProfile.mutateAsync({
        name: name.trim(),
        username: username.trim(),
        country: country.trim(),
        gender: gender.trim() || undefined,
        birthYear: birthYearNum,
        bio: bio.trim() || undefined,
        profilePicture,
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      await deleteProfile.mutateAsync();
      toast.success("Profile deleted successfully");
    } catch (error) {
      toast.error("Failed to delete profile");
      console.error(error);
    }
  };

  if (!identity) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl">
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
        {!isEditing && profile && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-10 sm:w-10"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Skeleton className="h-16 w-16 sm:h-24 sm:w-24 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 sm:h-6 w-full max-w-[150px]" />
                <Skeleton className="h-3 sm:h-4 w-full max-w-[100px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : profile ? (
        <Card>
          {!isEditing ? (
            <>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar className="h-16 w-16 sm:h-24 sm:w-24 shrink-0">
                    {profile.profilePicture ? (
                      <AvatarImage
                        src={profile.profilePicture.getDirectURL()}
                      />
                    ) : null}
                    <AvatarFallback className="text-xl sm:text-2xl">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl sm:text-2xl truncate">
                      {profile.name}
                    </CardTitle>
                    <p className="text-sm sm:text-base text-muted-foreground truncate">
                      @{profile.username}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div>
                        <span className="font-semibold">
                          {Number(followerCount || 0)}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          Followers
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">
                          {Number(followingCount || 0)}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          Following
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div className="grid gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{profile.country}</span>
                  </div>
                  {profile.birthYear && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>Born in {Number(profile.birthYear)}</span>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{profile.gender}</span>
                    </div>
                  )}
                </div>

                {profile.bio && (
                  <div className="pt-2">
                    <h3 className="mb-2 font-semibold text-sm sm:text-base">
                      About Me
                    </h3>
                    <p className="text-sm text-muted-foreground break-words">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => navigate({ to: "/analytics" })}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  )}
                  <LoginButton />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Profile
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[95vw] max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg">
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This action cannot be undone. This will permanently
                          delete your profile and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteProfile}
                          disabled={deleteProfile.isPending}
                          className="w-full sm:w-auto"
                        >
                          {deleteProfile.isPending
                            ? "Deleting..."
                            : "Delete Profile"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </>
          ) : (
            <form onSubmit={handleSaveProfile}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">
                  Edit Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    {avatarPreview ? <AvatarImage src={avatarPreview} /> : null}
                    <AvatarFallback className="text-xl sm:text-2xl">
                      {name.charAt(0).toUpperCase() ||
                        profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Change Avatar
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm">
                    Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a unique username"
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
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Enter your country"
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-gender" className="text-sm">
                    Gender
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
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
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="e.g., 1990"
                    min="1900"
                    max={new Date().getFullYear() - 18}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 18 years old
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bio" className="text-sm">
                    Bio
                  </Label>
                  <Textarea
                    id="edit-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="text-base resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={saveProfile.isPending}
                    className="flex-1"
                  >
                    {saveProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </form>
          )}
        </Card>
      ) : null}
    </div>
  );
}
