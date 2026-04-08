import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pause, Play, Square, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import {
  selectVideoMimeType,
  shouldWarnWebMCompatibility,
} from "../lib/videoMime";

interface VideoRecorderProps {
  onRecorded: (blob: Blob) => void;
  onCancel: () => void;
}

export default function VideoRecorder({
  onRecorded,
  onCancel,
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedMimeType, setSelectedMimeType] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isActive,
    error,
    isLoading,
    startCamera,
    stopCamera,
    videoRef,
    canvasRef,
  } = useCamera({
    facingMode: "user",
    width: 1280,
    height: 720,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: startCamera/stopCamera are stable refs from useCamera
  useEffect(() => {
    // Select the best mimeType on mount
    const mimeType = selectVideoMimeType();
    setSelectedMimeType(mimeType);

    // Warn if WebM on iOS
    if (shouldWarnWebMCompatibility(mimeType)) {
      toast.warning(
        "WebM recording may not play on all phones. MP4 is recommended for best compatibility.",
        {
          duration: 5000,
        },
      );
    }

    startCamera();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      stopCamera();
    };
  }, []);

  const startRecording = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      toast.error("Camera not ready");
      return;
    }

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the selected mimeType for the blob
        const blob = new Blob(videoChunksRef.current, {
          type: selectedMimeType,
        });
        setRecordedBlob(blob);
        stopCamera();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("Failed to start recording");
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = async () => {
    if (!recordedBlob || !playbackVideoRef.current) return;

    if (isPlaying) {
      playbackVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await playbackVideoRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback error:", err);
        toast.error(
          "This video format may not be supported on your device. Try recording again or use a different browser.",
        );
      }
    }
  };

  const handleSend = async () => {
    if (recordedBlob && !isSending) {
      setIsSending(true);
      try {
        await onRecorded(recordedBlob);
      } finally {
        setIsSending(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle video element errors
  useEffect(() => {
    const video = playbackVideoRef.current;
    if (!video || !recordedBlob) return;

    const handleError = () => {
      toast.error(
        "Video format may be unsupported on this device. For best results, use MP4 (H.264/AAC).",
      );
    };

    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("error", handleError);
    };
  }, [recordedBlob]);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Video Message</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {error && (
            <div className="text-destructive text-sm">
              Error: {error.message}
            </div>
          )}

          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            {!recordedBlob ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <video
                ref={playbackVideoRef}
                src={URL.createObjectURL(recordedBlob)}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            )}

            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-mono">
              {formatTime(recordingTime)}
            </div>
          </div>

          {!recordedBlob ? (
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isActive || isLoading}
              className="rounded-full h-16 w-16"
            >
              {isRecording ? (
                <Square className="h-6 w-6" />
              ) : (
                <Video className="h-6 w-6" />
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={togglePlayback}
              className="rounded-full h-16 w-16"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            {!recordedBlob
              ? isRecording
                ? "Recording... Click to stop"
                : isActive
                  ? "Click to start recording"
                  : "Starting camera..."
              : "Click to preview your video"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {recordedBlob && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : "Send Video"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
