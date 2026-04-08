import { Clock } from "lucide-react";

interface ExpiredMediaPlaceholderProps {
  mediaType: "image" | "video" | "voice" | "media";
  className?: string;
}

export default function ExpiredMediaPlaceholder({
  mediaType,
  className = "",
}: ExpiredMediaPlaceholderProps) {
  const mediaTypeText = {
    image: "Image",
    video: "Video",
    voice: "Voice message",
    media: "Media",
  }[mediaType];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 p-4 sm:p-6 bg-gradient-to-br from-rose-100/50 to-pink-100/50 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-200 dark:border-rose-800 rounded-lg ${className}`}
    >
      <img
        src="/assets/generated/expired-media-placeholder.dim_300x200.png"
        alt="Expired media"
        className="w-16 h-16 sm:w-20 sm:h-20 opacity-50"
      />
      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
        <Clock className="h-4 w-4" />
        <p className="text-xs sm:text-sm font-medium">This media has expired</p>
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
        {mediaTypeText} content is automatically deleted after 72 hours
      </p>
    </div>
  );
}
