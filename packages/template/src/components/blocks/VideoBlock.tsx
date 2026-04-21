import type { VideoBlockContent } from "../../types";

export function VideoBlock({ content }: { content: VideoBlockContent }) {
  // Prefer tenant-uploaded media. The proxy endpoint redirects to a fresh
  // signed URL and works for images, audio and video alike.
  const resolvedUrl = content.mediaId
    ? `/api/media/${content.mediaId}/img`
    : content.url;

  if (!resolvedUrl) {
    return null;
  }

  const url = resolvedUrl;
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");

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
      <section className="mx-auto max-w-4xl px-6 py-8">
        {content.title && <h3 className="mb-4 text-2xl font-bold">{content.title}</h3>}
        <div className="relative overflow-hidden rounded-lg pt-[56.25%]">
          <iframe
            src={embedUrl}
            title={content.title || "Video"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>
    );
  }

  // Native video — works for both tenant-uploaded files (/api/media/{id}/img)
  // and plain external URLs.
  return (
    <section className="mx-auto max-w-4xl px-6 py-8">
      {content.title && <h3 className="mb-4 text-2xl font-bold">{content.title}</h3>}
      <video
        src={url}
        controls
        autoPlay={content.autoplay}
        playsInline
        className="w-full rounded-lg"
      />
    </section>
  );
}
