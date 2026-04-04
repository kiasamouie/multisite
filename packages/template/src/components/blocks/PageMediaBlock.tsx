"use client";

import type { PageMediaBlockContent, PageMediaAsset } from "../../types";
import { usePageMedia } from "../../renderer/PageContext";

interface PageMediaBlockProps {
  content: PageMediaBlockContent;
}

/**
 * Renders media attached to the current page via media_page_associations.
 * Reads from PageMediaContext — no direct DB calls.
 *
 * Block content only declares *which* media to show (usage_type)
 * and *how* to show it (display_mode). The actual assets are resolved
 * at the server level and passed through context.
 */
export function PageMediaBlock({ content }: PageMediaBlockProps) {
  const { assets: allAssets, getByUsageType } = usePageMedia();
  const assets = getByUsageType(content.usage_type);

  console.log("🎬 PageMediaBlock:", {
    usage_type: content.usage_type,
    total_assets: allAssets.length,
    filtered_assets: assets.length,
    assets: assets.map(a => ({ id: a.id, filename: a.filename, type: a.type, usage_type: a.usage_type })),
  });

  if (assets.length === 0) return null;

  const mode = content.display_mode ?? "gallery";

  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {content.title && (
          <h2 className="mb-8 text-center text-3xl font-bold">{content.title}</h2>
        )}
        {mode === "single" && <SingleAsset asset={assets[0]} />}
        {mode === "gallery" && <GalleryAssets assets={assets} />}
        {mode === "list" && <ListAssets assets={assets} />}
      </div>
    </section>
  );
}

// ── Render per media type ──

function SingleAsset({ asset }: { asset: PageMediaAsset }) {
  switch (asset.type) {
    case "image":
      return <ImageAsset asset={asset} />;
    case "video":
      return <VideoAsset asset={asset} />;
    case "audio":
      return <AudioAsset asset={asset} />;
    default:
      return <DocumentAsset asset={asset} />;
  }
}

function ImageAsset({ asset }: { asset: PageMediaAsset }) {
  return (
    <figure>
      <img
        src={asset.signedUrl}
        alt={asset.filename}
        className="h-auto w-full rounded-lg object-cover"
        loading="lazy"
      />
    </figure>
  );
}

function VideoAsset({ asset }: { asset: PageMediaAsset }) {
  return (
    <video
      src={asset.signedUrl}
      controls
      className="w-full rounded-lg"
      preload="metadata"
    />
  );
}

function AudioAsset({ asset }: { asset: PageMediaAsset }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <span className="text-2xl">🎵</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{asset.filename}</p>
        <audio src={asset.signedUrl} controls className="mt-2 w-full" preload="metadata" />
      </div>
    </div>
  );
}

function DocumentAsset({ asset }: { asset: PageMediaAsset }) {
  return (
    <a
      href={asset.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
    >
      <span className="text-2xl">📄</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{asset.filename}</p>
        <p className="text-xs text-muted-foreground">Click to download</p>
      </div>
    </a>
  );
}

// ── Multi-asset layouts ──

function GalleryAssets({ assets }: { assets: PageMediaAsset[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <div key={asset.id} className="overflow-hidden rounded-xl">
          <SingleAsset asset={asset} />
        </div>
      ))}
    </div>
  );
}

function ListAssets({ assets }: { assets: PageMediaAsset[] }) {
  return (
    <div className="space-y-4">
      {assets.map((asset) => (
        <div key={asset.id}>
          <SingleAsset asset={asset} />
        </div>
      ))}
    </div>
  );
}
