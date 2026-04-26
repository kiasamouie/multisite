"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { SeoSettings } from "@repo/lib/site-settings/types";
import { saveSettingsAction } from "../_actions";

export function SeoForm({ initial }: { initial: SeoSettings }) {
  const [pending, startTransition] = useTransition();
  const [defaultTitle, setDefaultTitle] = useState(
    initial.defaultMetaTitle ?? "",
  );
  const [pattern, setPattern] = useState(
    initial.metaTitlePattern ?? "{pageTitle} — {siteName}",
  );
  const [description, setDescription] = useState(
    initial.defaultMetaDescription ?? "",
  );
  const [robotsAllow, setRobotsAllow] = useState(initial.robotsAllow ?? true);
  const [sitemap, setSitemap] = useState(initial.sitemapEnabled ?? true);

  const onSave = () => {
    const next: SeoSettings = {
      defaultMetaTitle: defaultTitle || undefined,
      metaTitlePattern: pattern || undefined,
      defaultMetaDescription: description || undefined,
      robotsAllow,
      sitemapEnabled: sitemap,
    };
    startTransition(async () => {
      const res = await saveSettingsAction("seo", next);
      if (res.ok) toast.success("SEO settings saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-title">Default meta title</Label>
            <Input
              id="default-title"
              value={defaultTitle}
              onChange={(e) => setDefaultTitle(e.target.value)}
              placeholder="Home page title used when none set"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="title-pattern">Title pattern</Label>
            <Input
              id="title-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="{pageTitle} — {siteName}"
              className="mt-1 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tokens: <code>{"{pageTitle}"}</code>, <code>{"{siteName}"}</code>.
            </p>
          </div>
          <div>
            <Label htmlFor="default-description">Default description</Label>
            <Input
              id="default-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Used when a page has no description"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indexing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            id="robots-allow"
            label="Allow search engines to index"
            description="When off, the site emits robots: noindex, nofollow."
            checked={robotsAllow}
            onChange={setRobotsAllow}
          />
          <Row
            id="sitemap"
            label="Generate sitemap.xml"
            description="Expose a sitemap at /sitemap.xml listing every published page."
            checked={sitemap}
            onChange={setSitemap}
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
