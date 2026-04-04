"use client";

import { ReactNode } from "react";

interface EditModalProps {
  isOpen: boolean;
  isLoading: boolean;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  children: ReactNode;
}

export function EditModal({
  isOpen,
  isLoading,
  title,
  onSubmit,
  onClose,
  children,
}: EditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm w-full dark:bg-slate-950">
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-3">{children}</div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
