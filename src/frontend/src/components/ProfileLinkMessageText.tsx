import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { parseProfileLinks } from "../lib/profileLinkDetection";
import { buildProfileUrl } from "../lib/profileLinks";

interface ProfileLinkMessageTextProps {
  text: string;
  className?: string;
}

/**
 * Renders message text with clickable profile links
 * Detects /users/<principal> patterns and makes them interactive
 */
export default function ProfileLinkMessageText({
  text,
  className = "",
}: ProfileLinkMessageTextProps) {
  const navigate = useNavigate();
  const segments = parseProfileLinks(text);

  const handleProfileLinkClick = (userId: string) => {
    navigate({ to: "/users/$userId", params: { userId } });
  };

  const handleCopyProfileLink = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildProfileUrl(userId);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied to clipboard");
    } catch (_error) {
      toast.error("Failed to copy link");
    }
  };

  // If no profile links detected, render plain text
  if (segments.length === 1 && segments[0].type === "text") {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }
        // Profile link segment
        return (
          <span key={index} className="inline-flex items-center gap-1">
            <button
              onClick={() => handleProfileLinkClick(segment.userId!)}
              className="text-primary hover:underline font-medium cursor-pointer inline-flex items-center"
            >
              {segment.content}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 inline-flex"
              onClick={(e) => handleCopyProfileLink(segment.userId!, e)}
              title="Copy profile link"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </span>
        );
      })}
    </p>
  );
}
