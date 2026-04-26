"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { PlatformSecuritySettings } from "../_actions";
import { savePlatformSettingsAction } from "../_actions";

export function SecurityForm({
  initial,
}: {
  initial: PlatformSecuritySettings;
}) {
  const [pending, startTransition] = useTransition();
  const [allowSignup, setAllowSignup] = useState(
    initial.allowPublicSignup ?? true,
  );
  const [requireVerification, setRequireVerification] = useState(
    initial.requireEmailVerification ?? false,
  );

  const onSave = () => {
    startTransition(async () => {
      const res = await savePlatformSettingsAction("security", {
        allowPublicSignup: allowSignup,
        requireEmailVerification: requireVerification,
      });
      if (res.ok) toast.success("Security settings saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signup &amp; authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allow-signup" className="text-sm font-medium">
                Allow public signup
              </Label>
              <p className="text-xs text-muted-foreground">
                When disabled, new tenants can only be created by a super admin.
              </p>
            </div>
            <Switch
              id="allow-signup"
              checked={allowSignup}
              onCheckedChange={setAllowSignup}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="require-verification"
                className="text-sm font-medium"
              >
                Require email verification
              </Label>
              <p className="text-xs text-muted-foreground">
                Users must verify their email before accessing the dashboard.
              </p>
            </div>
            <Switch
              id="require-verification"
              checked={requireVerification}
              onCheckedChange={setRequireVerification}
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
