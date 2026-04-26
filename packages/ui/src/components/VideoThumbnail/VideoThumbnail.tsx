"use client";

import { useRef, useState } from "react";
import { Video as VideoIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
  /** Show a small play-indicator overlay on the thumbnail */
  showPlayIcon?: boolean;
}

/**
 * VideoThumbnail — shows the first frame of a video as a static preview.
 * Falls back to a camera icon if the video cannot load.
 *
 * Uses <video preload="metadata"> which tells the browser to fetch just
 * enough bytes to decode the first frame — no full download required.
 */
export function VideoThumbnail({
  src,
  alt,
  className,
  showPlayIcon = true,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted",
          className
        )}
        aria-label={alt ?? "Video preview unavailable"}
      >
        <VideoIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        muted
        playsInline
        className="h-full w-full object-cover"
        onError={() => setError(true)}
        onLoadedMetadata={() => {
          // Seek to 0.1s to ensure a frame is decoded for preview
          if (videoRef.current && videoRef.current.duration > 0.1) {
            try {
              videoRef.current.currentTime = 0.1;
            } catch {
              // some browsers fail silently — ignore
            }
          }
        }}
      />
      {showPlayIcon && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/50 p-1.5">
            <VideoIcon className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
