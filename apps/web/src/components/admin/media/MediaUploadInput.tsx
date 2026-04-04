"use client";

import { useState, useRef, useEffect } from "react";
import { useTenantAdmin } from "../tenants";

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

interface MediaUploadInputProps {
  onUploadComplete?: (filename: string, url: string, mediaId?: number, pageIds?: number[]) => void;
  onError?: (error: string) => void;
}

/**
 * Media upload input with page association support.
 * Allows uploading files and associating them with one or more pages.
 * Page associations are optional - media can be uploaded without association.
 * Super admins can target any tenant via a tenant selector.
 */
export function MediaUploadInput({ onUploadComplete, onError }: MediaUploadInputProps) {
  const { tenantId } = useTenantAdmin();
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
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Target Tenant
          </label>
          {loadingTenants ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading tenants...</p>
          ) : (
            <select
              value={selectedTenantId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTenantId(val ? Number(val) : null);
              }}
              disabled={uploading}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">— Select a tenant —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.domain})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Page Association (Optional) */}
      <div className="w-full rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30 sm:p-4">
        <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          Associate with Pages (Optional)
        </h4>

        <div className="w-full space-y-3">
          {/* Usage Type Selector */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Usage Type
            </label>
            <select
              value={usageType}
              onChange={(e) => {
                setUsageType(e.target.value);
                if (e.target.value !== "pages") setSelectedPages([]);
              }}
              disabled={uploading}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="general">General</option>
              <option value="hero">Hero Image</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="gallery">Gallery</option>
              <option value="background">Background</option>
              <option value="icon">Icon</option>
              <option value="pages">Pages</option>
            </select>
          </div>

          {/* Pages List — only shown when usage type is "pages" */}
          {usageType === "pages" && (
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Select Pages
              </label>
              {isSuper && !selectedTenantId ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Select a tenant above to see its pages.</p>
              ) : loadingPages ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading pages...</p>
              ) : pages.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  No pages available. Create a page first.
                </p>
              ) : (
                <div className="mt-2 flex max-h-40 w-full flex-col overflow-y-auto rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                  {pages.map((page) => (
                    <label
                      key={page.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-2 py-2 last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPages.includes(page.id)}
                        onChange={() => togglePageSelection(page.id)}
                        disabled={uploading}
                        className="rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-gray-900 dark:text-gray-100">{page.title}</div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">/{page.slug}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedPages.length > 0 && (
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
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
        className={`w-full rounded border-2 border-dashed p-4 text-center transition sm:p-6 ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : pendingFiles.length > 0
            ? "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
            : "border-gray-300 dark:border-gray-600"
        }`}
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
            <div className="max-h-40 w-full overflow-y-auto rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0 dark:border-gray-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-600 disabled:opacity-50 dark:text-gray-500 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} ready to upload
            </p>
          </div>
        ) : (
          <label htmlFor="media-upload" className="cursor-pointer">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop files or click to select
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max 100MB per file</p>
          </label>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pendingFiles.length === 0 || uploading || !effectiveTenantId}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
