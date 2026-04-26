import type { VideoBlockContent } from "../../types";
import {
  readStyledText,
  resolveContentStyle,
} from "../../lib/content-style";

export function VideoBlock({ content }: { content: VideoBlockContent }) {
  // Prefer tenant-uploaded media. The proxy endpoint redirects to a fresh
  // signed URL and works for images, audio and video alike.
  const resolvedUrl = content.mediaId
    ? `/api/media/${content.mediaId}/img`
    : content.url;

  if (!resolvedUrl) return null;

  const url = resolvedUrl;
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");

  // Generic style resolution — title is a styled text, section + video
  // each carry a `ContentStyle` blob.
  const t = readStyledText(content.title);
  const titleR = resolveContentStyle("heading", t.style);
  const sectionR = resolveContentStyle("section", content.sectionStyle);
  const videoR = resolveContentStyle("video", content.videoStyle);

  const sectionClass = ["px-6 py-8", sectionR.className].filter(Boolean).join(" ");
  const containerClass = "mx-auto w-full max-w-4xl";

  if (isYouTube || isVimeo) {
    let embedUrl = url;
    if (isYouTube) {
      const match = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
      if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
    }
    if (isVimeo) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) embedUrl = `https://player.vimeo.com/video/${match[1]}`;
    }

    return (
      <section className={sectionClass} style={sectionR.style}>
        <div className={containerClass}>
          {t.value && (
            <h3
              className={["mb-4 text-2xl font-bold", titleR.className]
                .filter(Boolean)
                .join(" ")}
              style={titleR.style}
            >
              {t.value}
            </h3>
          )}
          <div
            className={["relative overflow-hidden", videoR.className]
              .filter(Boolean)
              .join(" ")}
            style={{
              ...videoR.style,
              paddingTop: videoR.aspectPadding ?? "56.25%",
            }}
          >
            <iframe
              src={embedUrl}
              title={t.value || "Video"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    );
  }

  // Native video — works for both tenant-uploaded files (/api/media/{id}/img)
  // and plain external URLs.
  return (
    <section className={sectionClass} style={sectionR.style}>
      <div className={containerClass}>
        {t.value && (
          <h3
            className={["mb-4 text-2xl font-bold", titleR.className]
              .filter(Boolean)
              .join(" ")}
            style={titleR.style}
          >
            {t.value}
          </h3>
        )}
        <video
          src={url}
          controls
          autoPlay={content.autoplay}
          playsInline
          className={["w-full", videoR.className].filter(Boolean).join(" ")}
          style={videoR.style}
        />
      </div>
    </section>
  );
}
