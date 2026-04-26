"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { AdvancedSettings } from "@repo/lib/site-settings/types";
import { saveSettingsAction } from "../_actions";

export function AdvancedForm({ initial }: { initial: AdvancedSettings }) {
  const [pending, startTransition] = useTransition();
  const [css, setCss] = useState(initial.customCss ?? "");
  const [head, setHead] = useState(initial.customHeadHtml ?? "");

  const onSave = () => {
    const next: AdvancedSettings = {
      customCss: css || undefined,
      customHeadHtml: head || undefined,
    };
    startTransition(async () => {
      const res = await saveSettingsAction("advanced", next);
      if (res.ok) toast.success("Advanced settings saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom CSS</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="custom-css" className="sr-only">
            Custom CSS
          </Label>
          <textarea
            id="custom-css"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"/* e.g. */\n.tenant-header { letter-spacing: 0.02em; }"}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom &lt;head&gt; HTML</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="custom-head" className="sr-only">
            Custom head HTML
          </Label>
          <textarea
            id="custom-head"
            value={head}
            onChange={(e) => setHead(e.target.value)}
            rows={6}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder='<!-- e.g. analytics tag -->'
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
