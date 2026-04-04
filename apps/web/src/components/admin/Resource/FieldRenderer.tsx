"use client";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { Switch } from "@repo/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import type { FieldDef } from "./types";

interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
  isEditMode: boolean;
}

export function FieldRenderer({ field, value, onChange, isEditMode }: FieldRendererProps) {
  const disabled = isEditMode && (field.disabledOnEdit ?? false);

  if (field.type === "select") {
    return (
      <div className="grid gap-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Select
          value={String(value ?? "")}
          onValueChange={(val) => onChange(val)}
          disabled={disabled}
        >
          <SelectTrigger id={field.key}>
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-3">
        <Switch
          id={field.key}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={disabled}
        />
        <Label htmlFor={field.key}>{field.label}</Label>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="grid gap-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Textarea
          id={field.key}
          placeholder={field.placeholder ?? field.label}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={field.required}
          rows={3}
        />
      </div>
    );
  }

  // text | email | number
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.key}>{field.label}</Label>
      <Input
        id={field.key}
        type={field.type}
        placeholder={field.placeholder ?? field.label}
        value={String(value ?? "")}
        onChange={(e) =>
          onChange(
            field.type === "number" && e.target.value !== ""
              ? Number(e.target.value)
              : e.target.value
          )
        }
        disabled={disabled}
        required={field.required}
      />
    </div>
  );
}
