import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

export default function ProfileSetupModal() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [bio, setBio] = useState("");

  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
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
      await saveProfile.mutateAsync({
        name: name.trim(),
        username: username.trim(),
        country: country.trim(),
        gender: gender.trim() || undefined,
        birthYear: birthYearNum,
        bio: bio.trim() || undefined,
        profilePicture: undefined,
      });
      toast.success("Profile created successfully!");
    } catch (error) {
      toast.error("Failed to create profile");
      console.error(error);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto card-romantic animate-slide-up"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Welcome! Let's set up your profile 💕
          </DialogTitle>
          <DialogDescription className="text-sm">
            Complete your profile to start connecting with others
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username *
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a unique username"
              required
              className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium">
              Country *
            </Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Enter your country"
              required
              className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="border-t border-primary/10 pt-3 sm:pt-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">
              Optional Information
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium">
                  Gender
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger
                    id="gender"
                    className="rounded-xl border-primary/20"
                  >
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
                <Label htmlFor="birthYear" className="text-sm font-medium">
                  Birth Year
                </Label>
                <Input
                  id="birthYear"
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="e.g., 1990"
                  min="1900"
                  max={new Date().getFullYear() - 18}
                  className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 18 years old
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="text-base resize-none rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rose-gradient hover:shadow-rose-glow transition-all rounded-xl"
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? "Creating Profile..." : "Create Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
