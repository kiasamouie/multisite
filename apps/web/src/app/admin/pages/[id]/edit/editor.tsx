"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck/config";
import type { PuckData } from "@/lib/puck/adapter";
import { toast } from "sonner";

interface PuckEditorProps {
  pageId: number;
  pageTitle: string;
  initialData: PuckData;
}

export function PuckEditor({ pageId, pageTitle, initialData }: PuckEditorProps) {
  const router = useRouter();

  const handlePublish = useCallback(
    async (data: PuckData) => {
      try {
        const res = await fetch(`/api/admin/pages/${pageId}/puck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Failed to save");
          return;
        }

        toast.success("Page published successfully");
        router.refresh();
      } catch {
        toast.error("Network error while saving");
      }
    },
    [pageId, router]
  );

  return (
    <div style={{ height: "100vh" }}>
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={handlePublish}
        headerTitle={pageTitle}
        headerPath={`/admin/pages/${pageId}/edit`}
      />
    </div>
  );
}
