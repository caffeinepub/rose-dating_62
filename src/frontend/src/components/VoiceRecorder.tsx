import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mic, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => void;
  onCancel: () => void;
}

/**
 * Select the best supported audio MIME type for recording.
 * Prefers audio/mp4 (AAC) for iOS/Safari compatibility, falls back to audio/webm.
 */
function selectAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";

  const candidates = [
    "audio/mp4;codecs=mp4a.40.2", // AAC-LC in MP4 — best for iOS Safari
    "audio/mp4", // Generic MP4 audio
    "audio/aac", // AAC
    "audio/webm;codecs=opus", // Opus in WebM — best for Chrome/Android
    "audio/webm", // Generic WebM
    "audio/ogg;codecs=opus", // Opus in Ogg
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "audio/webm";
}

export default function VoiceRecorder({
  onRecorded,
  onCancel,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedMimeType, setSelectedMimeType] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const mimeType = selectAudioMimeType();
    setSelectedMimeType(mimeType);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      // Revoke any created object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = {};
      if (selectedMimeType && MediaRecorder.isTypeSupported(selectedMimeType)) {
        options.mimeType = selectedMimeType;
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType =
          mediaRecorder.mimeType || selectedMimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("Failed to access microphone");
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

  // Build a fresh object URL for the audio element whenever recordedBlob changes
  const getAudioSrc = (): string => {
    if (!recordedBlob) return "";
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(recordedBlob);
    objectUrlRef.current = url;
    return url;
  };

  const togglePlayback = () => {
    if (!recordedBlob || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          toast.error(
            "Could not play audio. This format may not be supported on your device.",
          );
        });
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

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Voice Message</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          {recordedBlob && (
            <audio
              ref={audioRef}
              src={getAudioSrc()}
              onEnded={() => setIsPlaying(false)}
              onError={() =>
                toast.error(
                  "Audio playback error. Format may not be supported.",
                )
              }
              className="hidden"
              preload="metadata"
            />
          )}

          <div className="text-4xl font-mono">{formatTime(recordingTime)}</div>

          {!recordedBlob ? (
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              className="rounded-full h-20 w-20"
            >
              {isRecording ? (
                <Square className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={togglePlayback}
              className="rounded-full h-20 w-20"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            {!recordedBlob
              ? isRecording
                ? "Recording... Click to stop"
                : "Click to start recording"
              : "Click to preview your recording"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {recordedBlob && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : "Send Voice Message"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
