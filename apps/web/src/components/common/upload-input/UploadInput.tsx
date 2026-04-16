"use client";

import { useState, useRef, useEffect } from "react";
import { useAdmin } from "@/context/admin-context";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { ScrollArea } from "@repo/ui/scroll-area";
import { cn } from "@repo/ui/cn";

interface PageOption {
  id: number;
  title: string;
  slug: string;
}

interface TenantOption {
  id: number;
  name: string;
  domain: string;
}

interface UploadInputProps {
  onUploadComplete?: (filename: string, url: string, mediaId?: number, pageIds?: number[]) => void;
  onError?: (error: string) => void;
}

/**
 * Media upload input with page association support.
 * Allows uploading files and associating them with one or more pages.
 * Page associations are optional - media can be uploaded without association.
 * Super admins can target any tenant via a tenant selector.
 */
export function UploadInput({ onUploadComplete, onError }: UploadInputProps) {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [usageType, setUsageType] = useState("general");
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

  // Load pages whenever the effective tenant changes
  useEffect(() => {
    if (!effectiveTenantId) return;
    setPages([]);
    setSelectedPages([]);
    setLoadingPages(true);
    fetch(`/api/admin/pages?tenantId=${effectiveTenantId}&fields=id,title,slug`)
      .then((r) => r.json())
      .then((data) => setPages(data.pages || []))
      .catch((err) => console.error("Failed to load pages:", err))
      .finally(() => setLoadingPages(false));
  }, [effectiveTenantId]);

  const stageFile = (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      onError?.("File must be less than 100MB");
      return;
    }
    setPendingFiles((prev) => [...prev, file]);
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

        // Add page associations if selected
        if (selectedPages.length > 0) {
          formData.append("pageIds", JSON.stringify(selectedPages));
          formData.append("usageType", usageType);
        }

        const response = await fetch("/api/admin/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Upload failed");
        }

        const { filename, url, mediaId, associatedPages } = await response.json();
        onUploadComplete?.(filename, url, mediaId, associatedPages);
      }

      // Reset form
      if (inputRef.current) inputRef.current.value = "";
      setPendingFiles([]);
      setSelectedPages([]);
      setUsageType("general");
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

  const togglePageSelection = (pageId: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
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

      {/* Page Association (Optional) */}
      <div className="w-full rounded-md border border-border bg-muted/30 p-3 sm:p-4">
        <h4 className="mb-3 text-sm font-medium text-foreground">
          Associate with Pages (Optional)
        </h4>

        <div className="w-full space-y-3">
          {/* Usage Type Selector */}
          <div className="w-full space-y-1">
            <Label className="text-xs font-medium">Usage Type</Label>
            <Select
              value={usageType}
              onValueChange={(val) => {
                setUsageType(val);
                if (val !== "pages") setSelectedPages([]);
              }}
              disabled={uploading}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hero">Hero Image</SelectItem>
                <SelectItem value="thumbnail">Thumbnail</SelectItem>
                <SelectItem value="gallery">Gallery</SelectItem>
                <SelectItem value="background">Background</SelectItem>
                <SelectItem value="icon">Icon</SelectItem>
                <SelectItem value="pages">Pages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pages List — only shown when usage type is "pages" */}
          {usageType === "pages" && (
            <div className="w-full space-y-1">
              <Label className="text-xs font-medium">Select Pages</Label>
              {isSuper && !selectedTenantId ? (
                <p className="pt-1 text-xs text-muted-foreground">Select a tenant above to see its pages.</p>
              ) : loadingPages ? (
                <p className="pt-1 text-xs text-muted-foreground">Loading pages...</p>
              ) : pages.length === 0 ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  No pages available. Create a page first.
                </p>
              ) : (
                <ScrollArea className="mt-1 h-40 w-full rounded-md border border-border bg-background">
                  {pages.map((page) => (
                    <label
                      key={page.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-border px-2 py-2 last:border-b-0 hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPages.includes(page.id)}
                        onChange={() => togglePageSelection(page.id)}
                        disabled={uploading}
                        className="h-4 w-4 shrink-0 rounded border-border accent-primary disabled:opacity-50"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-foreground">{page.title}</div>
                        <div className="truncate text-xs text-muted-foreground">/{page.slug}</div>
                      </div>
                    </label>
                  ))}
                </ScrollArea>
              )}
              {selectedPages.length > 0 && (
                <p className="text-xs text-primary">
                  {selectedPages.length} page{selectedPages.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
        </div>
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
