"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useAdmin } from "@/context/admin-context";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Badge } from "@repo/ui/badge";
import { ScrollArea } from "@repo/ui/scroll-area";
import { X } from "lucide-react";
import { cn } from "@repo/ui/cn";

interface TenantOption {
  id: number;
  name: string;
  domain: string;
}

interface UploadInputProps {
  onUploadComplete?: (filename: string, url: string, mediaId?: number) => void;
  onError?: (error: string) => void;
}

/**
 * Media upload input with optional tags support.
 * Allows uploading files and tagging them for filtering in media pickers.
 * Super admins can target any tenant via a tenant selector.
 */
export function UploadInput({ onUploadComplete, onError }: UploadInputProps) {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Super admin only
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // Effective tenant: super admin uses selectedTenantId, tenant admin uses their own tenantId
  const effectiveTenantId = isSuper ? selectedTenantId : tenantId;

  // Load tenants list for super admin
  useEffect(() => {
    if (!isSuper) return;
    setLoadingTenants(true);
    fetch("/api/admin/tenants?perPage=100")
      .then((r) => r.json())
      .then((data) => setTenants(data.tenants || []))
      .catch((err) => console.error("Failed to load tenants:", err))
      .finally(() => setLoadingTenants(false));
  }, [isSuper]);

  const addTag = (raw: string) => {
    const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed) return;
    // Split by comma in case user pastes multiple
    const parts = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
    setTags((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      return next;
    });
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const stageFiles = (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 100 * 1024 * 1024) {
        onError?.(`File "${file.name}" exceeds 100MB limit`);
        continue;
      }
      setPendingFiles((prev) => [...prev, file]);
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (pendingFiles.length === 0) return;

    if (!effectiveTenantId) {
      onError?.(isSuper ? "Select a tenant before uploading" : "Tenant ID not found");
      return;
    }

    setUploading(true);

    try {
      // Upload files sequentially
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", String(effectiveTenantId));
        if (tags.length > 0) {
          formData.append("tags", JSON.stringify(tags));
        }

        const response = await fetch("/api/admin/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Upload failed");
        }

        const { filename, url, mediaId } = await response.json();
        onUploadComplete?.(filename, url, mediaId);
      }

      // Reset form
      if (inputRef.current) inputRef.current.value = "";
      setPendingFiles([]);
      setTags([]);
      setTagInput("");
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) stageFiles(files);
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files) stageFiles(files);
  };

  return (
    <div className="w-full space-y-4">

      {/* Tenant Selector — super admin only */}
      {isSuper && (
        <div className="w-full space-y-1">
          <Label className="text-xs font-medium">Target Tenant</Label>
          {loadingTenants ? (
            <p className="text-xs text-muted-foreground">Loading tenants...</p>
          ) : (
            <Select
              value={selectedTenantId != null ? String(selectedTenantId) : ""}
              onValueChange={(val) => setSelectedTenantId(val ? Number(val) : null)}
              disabled={uploading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="— Select a tenant —" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.domain})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Tags Input */}
      <div className="w-full space-y-1.5">
        <Label className="text-xs font-medium">Tags (optional)</Label>
        <div
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm",
            "focus-within:ring-1 focus-within:ring-ring"
          )}
          onClick={() => document.getElementById("tag-input")?.focus()}
        >
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-normal">
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                disabled={uploading}
                className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            id="tag-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
            disabled={uploading}
            placeholder={tags.length === 0 ? "Add tags… (Enter or comma to add)" : ""}
            className="h-auto min-w-20 flex-1 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <p className="text-xs text-muted-foreground">e.g. hero, background, thumbnail — use to filter in media pickers</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEvents}
        onDragLeave={handleDragEvents}
        onDragOver={handleDragEvents}
        onDrop={handleDrop}
        className={cn(
          "w-full rounded-md border-2 border-dashed p-4 text-center transition sm:p-6",
          dragActive
            ? "border-primary bg-primary/5"
            : pendingFiles.length > 0
            ? "border-green-500 bg-green-500/5"
            : "border-border"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
          id="media-upload"
          multiple
        />
        {pendingFiles.length > 0 ? (
          <div className="space-y-2">
            <ScrollArea className="h-40 w-full rounded-md border border-border bg-background">
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="h-auto shrink-0 px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </ScrollArea>
            <p className="text-xs text-green-600 dark:text-green-400">
              {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} ready to upload
            </p>
          </div>
        ) : (
          <label htmlFor="media-upload" className="cursor-pointer">
            <p className="text-sm font-medium text-foreground">
              Drop files or click to select
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Max 100MB per file</p>
          </label>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={pendingFiles.length === 0 || uploading || !effectiveTenantId}
        className="w-full"
      >
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
}
