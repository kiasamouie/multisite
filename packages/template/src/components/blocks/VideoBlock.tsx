import type { VideoBlockContent } from "../../types";

export function VideoBlock({ content }: { content: VideoBlockContent }) {
  const isYouTube = content.url?.includes("youtube.com") || content.url?.includes("youtu.be");
  const isVimeo = content.url?.includes("vimeo.com");

  if (isYouTube || isVimeo) {
    let embedUrl = content.url;
    if (isYouTube) {
      const match = content.url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
      if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
    }
    if (isVimeo) {
      const match = content.url.match(/vimeo\.com\/(\d+)/);
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

  return (
    <section className="mx-auto max-w-4xl px-6 py-8">
      {content.title && <h3 className="mb-4 text-2xl font-bold">{content.title}</h3>}
      <video
        src={content.url}
        controls
        autoPlay={content.autoplay}
        className="w-full rounded-lg"
      />
    </section>
  );
}
