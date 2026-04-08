/**
 * Utility functions for building and sharing user profile links
 */

/**
 * Builds an absolute profile URL for a given userId
 * @param userId - The principal ID of the user
 * @returns The absolute URL to the user's profile
 */
export function buildProfileUrl(userId: string): string {
  const origin = window.location.origin;
  return `${origin}/users/${userId}`;
}

/**
 * Attempts to share a URL using the Web Share API, falls back to clipboard copy
 * @param url - The URL to share
 * @param title - Optional title for the share dialog
 * @returns Promise<'shared' | 'copied' | 'failed'> - Result of the share/copy operation
 */
export async function shareOrCopyUrl(
  url: string,
  title?: string,
): Promise<"shared" | "copied" | "failed"> {
  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || "Profile Link",
        url: url,
      });
      return "shared";
    } catch (error: any) {
      // User cancelled or share failed, fall through to clipboard
      if (error.name === "AbortError") {
        // User cancelled, try clipboard as fallback
      } else {
        console.error("Share failed:", error);
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (error) {
    console.error("Clipboard copy failed:", error);
    return "failed";
  }
}
