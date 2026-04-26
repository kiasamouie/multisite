"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { PlatformGeneralSettings } from "../_actions";
import { savePlatformSettingsAction } from "../_actions";

export function GeneralForm({ initial }: { initial: PlatformGeneralSettings }) {
  const [pending, startTransition] = useTransition();
  const [platformName, setPlatformName] = useState(initial.platformName ?? "Multisite");
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

  const onSave = () => {
    startTransition(async () => {
      const res = await savePlatformSettingsAction("general", {
        platformName: platformName || undefined,
        supportEmail: supportEmail || undefined,
        description: description || undefined,
      });
      if (res.ok) toast.success("General settings saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="platform-name">Platform name</Label>
            <Input
              id="platform-name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Multisite"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="support-email">Support email</Label>
            <Input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Shown to tenants when they need help.
            </p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of the platform."
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>
      <Button onClick={onSave} disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
