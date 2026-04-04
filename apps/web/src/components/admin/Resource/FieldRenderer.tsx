"use client";

import type { FieldDef } from "./types";

interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
  isEditMode: boolean;
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const disabledClass = "opacity-50 cursor-not-allowed";

export function FieldRenderer({ field, value, onChange, isEditMode }: FieldRendererProps) {
  const disabled = isEditMode && (field.disabledOnEdit ?? false);
  const cls = `${inputClass} ${disabled ? disabledClass : ""}`;

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={field.required}
          className={cls}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="rounded"
        />
        <span className="text-sm">{field.label}</span>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
        <textarea
          placeholder={field.placeholder ?? field.label}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={field.required}
          rows={3}
          className={`${cls} resize-none`}
        />
      </div>
    );
  }

  // text | email | number
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
      <input
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
        className={cls}
      />
    </div>
  );
}
