"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { Switch } from "@repo/ui/switch";
import { Label } from "@repo/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { NavigationSettings } from "@repo/lib/site-settings/types";
import { saveSettingsAction } from "../_actions";

export function NavigationForm({ initial }: { initial: NavigationSettings }) {
  const [pending, startTransition] = useTransition();
  const [smoothScroll, setSmoothScroll] = useState(
    initial.smoothScroll ?? true,
  );
  const [anchorFallback, setAnchorFallback] = useState(
    initial.anchorFallbackToPage ?? true,
  );

  const onSave = () => {
    const next: NavigationSettings = {
      smoothScroll,
      anchorFallbackToPage: anchorFallback,
    };
    startTransition(async () => {
      const res = await saveSettingsAction("navigation", next);
      if (res.ok) toast.success("Navigation saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Behaviour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            id="smooth-scroll"
            label="Smooth scroll for #anchor links"
            description="When a visitor clicks a link that points to a section anchor, the page scrolls smoothly to it."
            checked={smoothScroll}
            onChange={setSmoothScroll}
          />
          <Row
            id="anchor-fallback"
            label="Fall back to page if anchor missing"
            description="If a section's anchor was deleted, navigate to the page itself instead of breaking the link."
            checked={anchorFallback}
            onChange={setAnchorFallback}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Row({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
