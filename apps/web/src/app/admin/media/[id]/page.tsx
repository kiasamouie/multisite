"use client";

import { useEffect, useState, useCallback, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import { PageHeader, ReadOnlyField, DetailLayout } from "@/components/common";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Skeleton } from "@repo/ui/skeleton";
import {
  Download,
  Copy,
  FileAudio,
  FileVideo,
  FileText,
  File,
  ArrowLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface MediaRecord {
  id: number;
  tenant_id: number;
  url: string;
  filename: string;
  metadata: Record<string, unknown>;
  created_at: string;
  tags?: string[];
  tenants?: { id: number; name: string; domain: string };
}

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const mediaId = Number(params.id);

  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Tags state ─────────────────────────────────────────── */
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const select = isSuper ? "*, tenants(id, name, domain)" : "*";
      const { data, error } = await (supabase as ReturnType<typeof createBrowserClient> & { from: (t: string) => unknown })
        .from("media")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select(select)
        .eq("id", mediaId)
        .single() as { data: MediaRecord | null; error: unknown };
      if (error || !data) throw new Error("Not found");
      setMedia(data);
      setTags(data.tags ?? []);
    } catch {
      setMedia(null);
    } finally {
      setLoading(false);
    }
  }, [mediaId, isSuper]);

  const fetchSignedUrl = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/media/${mediaId}/download`);
      const data = await res.json();
      setSignedUrl(data.url ?? null);
    } catch {
      /* ignore */
    }
  }, [mediaId]);

  useEffect(() => {
    fetchMedia();
    fetchSignedUrl();
  }, [fetchMedia, fetchSignedUrl]);

  const addTag = (raw: string) => {
    const parts = raw.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean);
    setTags((prev) => {
      const next = [...prev];
      for (const p of parts) { if (!next.includes(p)) next.push(p); }
      return next;
    });
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) setTags((prev) => prev.slice(0, -1));
  };

  const saveTags = async (nextTags: string[]) => {
    if (!media) return;
    setSavingTags(true);
    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: nextTags }),
      });
      if (!res.ok) throw new Error("Failed to save tags");
      setTags(nextTags);
      toast.success("Tags saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save tags");
    } finally {
      setSavingTags(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <PageHeader
          title="Media Not Found"
          actions={
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/media")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
      </div>
    );
  }


  const metadata = media.metadata || {};
  const type = metadata.type ? String(metadata.type) : "unknown";
  const size = metadata.size ? Number(metadata.size) : 0;
  const sizeStr =
    size >= 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : size >= 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${size} bytes`;

  const copyPath = () => navigator.clipboard.writeText(media.url);

  const preview = (
    <div className="overflow-hidden rounded-xl bg-black/80">
      {type === "image" && signedUrl ? (
        <img src={signedUrl} alt={media.filename} className="max-h-80 w-full object-contain" />
      ) : type === "video" && signedUrl ? (
        <video src={signedUrl} controls className="max-h-80 w-full" preload="metadata" />
      ) : type === "audio" && signedUrl ? (
        <div className="flex flex-col items-center gap-2 p-5">
          <FileAudio className="h-8 w-8 text-muted-foreground" />
          <audio src={signedUrl} controls className="w-full" preload="metadata" />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
          {type === "video" ? <FileVideo className="h-8 w-8" /> : type === "document" ? <FileText className="h-8 w-8" /> : <File className="h-8 w-8" />}
          <span className="text-sm capitalize">{type}</span>
        </div>
      )}
    </div>
  );

  const main = (
    <div className="space-y-6">
      {preview}

      {signedUrl && (
        <Button asChild size="sm" className="btn-kinetic w-full gap-2 font-medium">
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-3.5 w-3.5" /> Download file
          </a>
        </Button>
      )}

      {/* Tags */}
      <div>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
        <div
          className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-within:ring-1 focus-within:ring-ring cursor-text"
          onClick={() => document.getElementById("detail-tag-input")?.focus()}
        >
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-normal">
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = tags.filter((t) => t !== tag);
                  removeTag(tag);
                  saveTags(next);
                }}
                disabled={savingTags}
                className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            id="detail-tag-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => {
              if (tagInput.trim()) {
                const parts = tagInput.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean);
                const next = [...tags];
                for (const p of parts) { if (!next.includes(p)) next.push(p); }
                setTagInput("");
                setTags(next);
                saveTags(next);
              }
            }}
            disabled={savingTags}
            placeholder={tags.length === 0 ? "Add tags… (Enter or comma)" : ""}
            className="h-auto min-w-20 flex-1 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Press Enter or comma to add. Use tags to filter in media pickers.</p>
      </div>
    </div>
  );

  const sidebar = (
    <div className="divide-y divide-border/30 rounded-xl bg-muted/40">
      <ReadOnlyField label="Filename">
        <div className="flex items-center gap-1">
          <span className="break-all text-xs font-medium">{media.filename}</span>
          <button onClick={copyPath} title="Copy path" className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </ReadOnlyField>
      <ReadOnlyField label="Type" value={type} />
      <ReadOnlyField label="Size" value={sizeStr} />
      {isSuper && media.tenants && (
        <ReadOnlyField label="Tenant">
          <p className="text-xs font-medium">{media.tenants.name}</p>
          <p className="text-xs text-muted-foreground">{media.tenants.domain}</p>
        </ReadOnlyField>
      )}
      <ReadOnlyField label="Uploaded" value={new Date(media.created_at).toLocaleString()} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageHeader
        title={media.filename}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/media")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Media
          </Button>
        }
      />
      <DetailLayout main={main} sidebar={sidebar} />
    </div>
  );
}
