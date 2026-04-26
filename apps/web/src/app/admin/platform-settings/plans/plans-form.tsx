"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { PlatformPlanSettings } from "../_actions";
import { savePlatformSettingsAction } from "../_actions";

export function PlansForm({ initial }: { initial: PlatformPlanSettings }) {
  const [pending, startTransition] = useTransition();
  const [trialDays, setTrialDays] = useState(
    String(initial.trialDays ?? 14),
  );
  const [defaultPlan, setDefaultPlan] = useState<"starter" | "growth" | "pro">(
    initial.defaultPlan ?? "starter",
  );

  const onSave = () => {
    const days = parseInt(trialDays, 10);
    if (isNaN(days) || days < 0) {
      toast.error("Trial days must be a non-negative number");
      return;
    }
    startTransition(async () => {
      const res = await savePlatformSettingsAction("plans", {
        trialDays: days,
        defaultPlan,
      });
      if (res.ok) toast.success("Plan settings saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New tenant defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="trial-days">Trial period (days)</Label>
            <Input
              id="trial-days"
              type="number"
              min={0}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="mt-1 w-32"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Set to 0 to disable trials.
            </p>
          </div>
          <div>
            <Label htmlFor="default-plan">Default plan</Label>
            <Select
              value={defaultPlan}
              onValueChange={(v) =>
                setDefaultPlan(v as "starter" | "growth" | "pro")
              }
            >
              <SelectTrigger id="default-plan" className="mt-1 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Plan automatically assigned when a new tenant is created.
            </p>
          </div>
        </CardContent>
      </Card>
      <Button onClick={onSave} disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
