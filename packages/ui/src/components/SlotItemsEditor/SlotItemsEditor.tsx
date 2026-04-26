"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { FONT_FAMILIES } from "../../lib/font-families";

// ── Types ─────────────────────────────────────────────────────────────────
//
// These mirror `HeaderSlotItem` from @repo/template/types but are duplicated
// here to keep `@repo/ui` free of a dependency on `@repo/template`.

export type SlotItemKind = "text" | "image" | "button";
export type SlotTextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
export type SlotTextWeight = "normal" | "medium" | "semibold" | "bold";
export type SlotButtonSize = "sm" | "default" | "lg";
export type SlotRounded = "none" | "sm" | "md" | "lg" | "full";

export interface SlotItemValue {
  kind: SlotItemKind;
  text?: string;
  imageId?: number | null;
  href?: string;

  textSize?: SlotTextSize;
  textSizePx?: number;
  textWeight?: SlotTextWeight;
  textColor?: string;
  italic?: boolean;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacingEm?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";

  imageHeight?: number;
  imageRounded?: SlotRounded;
  imageRoundedPx?: number;
  imageAlt?: string;

  variant?: "default" | "outline" | "ghost";
  buttonSize?: SlotButtonSize;
  buttonBg?: string;
  buttonFg?: string;

  marginX?: number;
}

export interface SlotItemsEditorProps {
  value: SlotItemValue[];
  onChange: (next: SlotItemValue[]) => void;
  /**
   * Caller provides the image picker UI (tenant-aware media library).
   * Called once per `image`-kind row.
   */
  renderImagePicker: (
    value: number | null,
    onChange: (id: number | null) => void,
  ) => ReactNode;
  addLabel?: string;
  emptyLabel?: string;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const KIND_LABEL: Record<SlotItemKind, string> = {
  text: "Text",
  image: "Image",
  button: "Button",
};

function defaultItemForKind(kind: SlotItemKind): SlotItemValue {
  switch (kind) {
    case "text":
      return { kind, text: "Label", textSize: "base", textWeight: "medium" };
    case "image":
      return { kind, imageId: null, imageHeight: 32, imageRounded: "none" };
    case "button":
      return {
        kind,
        text: "Click",
        href: "/",
        variant: "default",
        buttonSize: "default",
      };
  }
}

function summarise(item: SlotItemValue): string {
  if (item.kind === "text") return `Text: "${item.text || "—"}"`;
  if (item.kind === "button") return `Button: "${item.text || "—"}"`;
  return item.imageId ? `Image #${item.imageId}` : "Image (none)";
}

// ── Editor ────────────────────────────────────────────────────────────────

export function SlotItemsEditor({
  value,
  onChange,
  renderImagePicker,
  addLabel = "Add item",
  emptyLabel = "No items yet",
  className,
}: SlotItemsEditorProps) {
  const items = Array.isArray(value) ? value : [];

  const updateAt = (i: number, next: SlotItemValue) => {
    const copy = [...items];
    copy[i] = next;
    onChange(copy);
  };
  const removeAt = (i: number) => {
    const copy = [...items];
    copy.splice(i, 1);
    onChange(copy);
  };
  const moveUp = (i: number) => {
    if (i === 0) return;
    const copy = [...items];
    [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
    onChange(copy);
  };
  const moveDown = (i: number) => {
    if (i === items.length - 1) return;
    const copy = [...items];
    [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
    onChange(copy);
  };
  const add = () => {
    onChange([...items, defaultItemForKind("text")]);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
      {items.map((item, i) => (
        <SlotItemCard
          key={i}
          item={item}
          index={i}
          total={items.length}
          onChange={(next) => updateAt(i, next)}
          onRemove={() => removeAt(i)}
          onMoveUp={() => moveUp(i)}
          onMoveDown={() => moveDown(i)}
          renderImagePicker={renderImagePicker}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="self-start"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        {addLabel}
      </Button>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

interface SlotItemCardProps {
  item: SlotItemValue;
  index: number;
  total: number;
  onChange: (next: SlotItemValue) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  renderImagePicker: SlotItemsEditorProps["renderImagePicker"];
}

function SlotItemCard({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  renderImagePicker,
}: SlotItemCardProps) {
  const [open, setOpen] = useState(false);
  const [showStyle, setShowStyle] = useState(false);

  const patch = (p: Partial<SlotItemValue>) => onChange({ ...item, ...p });
  const changeKind = (k: SlotItemKind) => {
    // Preserve shared fields (text/href/marginX) but reset kind-specific ones.
    const base: SlotItemValue = { ...defaultItemForKind(k) };
    if (item.text && (k === "text" || k === "button")) base.text = item.text;
    if (item.href) base.href = item.href;
    if (item.marginX !== undefined) base.marginX = item.marginX;
    onChange(base);
  };

  return (
    <Card className="p-3 bg-background">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">
            #{index + 1} · {KIND_LABEL[item.kind]}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {summarise(item)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Kind select */}
          <div className="grid gap-1.5">
            <Label className="text-xs">Item type</Label>
            <Select
              value={item.kind}
              onValueChange={(v) => changeKind(v as SlotItemKind)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="button">Button</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kind-specific core fields */}
          {item.kind === "text" && (
            <>
              <FieldText
                label="Text"
                value={item.text ?? ""}
                onChange={(v) => patch({ text: v })}
                placeholder="Label"
              />
              <FieldText
                label="Link (optional)"
                value={item.href ?? ""}
                onChange={(v) => patch({ href: v })}
                placeholder="/path or https://…"
              />
            </>
          )}

          {item.kind === "image" && (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs">Image</Label>
                {renderImagePicker(item.imageId ?? null, (id) =>
                  patch({ imageId: id ?? null }),
                )}
              </div>
              <FieldText
                label="Alt text"
                value={item.imageAlt ?? ""}
                onChange={(v) => patch({ imageAlt: v })}
                placeholder="Describes the image"
              />
              <FieldText
                label="Link (optional)"
                value={item.href ?? ""}
                onChange={(v) => patch({ href: v })}
                placeholder="/path or https://…"
              />
            </>
          )}

          {item.kind === "button" && (
            <>
              <FieldText
                label="Button text"
                value={item.text ?? ""}
                onChange={(v) => patch({ text: v })}
                placeholder="Click"
              />
              <FieldText
                label="Link"
                value={item.href ?? ""}
                onChange={(v) => patch({ href: v })}
                placeholder="/path or https://…"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Variant</Label>
                  <Select
                    value={item.variant ?? "default"}
                    onValueChange={(v) =>
                      patch({ variant: v as SlotItemValue["variant"] })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Filled</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Size</Label>
                  <Select
                    value={item.buttonSize ?? "default"}
                    onValueChange={(v) =>
                      patch({ buttonSize: v as SlotButtonSize })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Style toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start h-7 px-2 text-xs"
            onClick={() => setShowStyle((s) => !s)}
          >
            {showStyle ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Style
          </Button>

          {showStyle && (
            <div className="flex flex-col gap-3 pl-1">
              {item.kind === "text" && (
                <>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Font family</Label>
                    <Select
                      value={item.fontFamily || "__none__"}
                      onValueChange={(v) =>
                        patch({ fontFamily: v === "__none__" ? undefined : v })
                      }
                    >
                      <SelectTrigger
                        className="h-8"
                        style={item.fontFamily ? { fontFamily: item.fontFamily } : undefined}
                      >
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {FONT_FAMILIES.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            style={{ fontFamily: opt.value }}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldSlider
                    label="Font size"
                    value={item.textSizePx}
                    min={8}
                    max={48}
                    step={1}
                    unit="px"
                    onChange={(v) => patch({ textSizePx: v })}
                  />
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Weight</Label>
                    <Select
                      value={item.textWeight ?? "medium"}
                      onValueChange={(v) =>
                        patch({ textWeight: v as SlotTextWeight })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="semibold">Semibold</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldSlider
                    label="Line height"
                    value={
                      typeof item.lineHeight === "number"
                        ? Math.round(item.lineHeight * 100)
                        : undefined
                    }
                    min={80}
                    max={250}
                    step={5}
                    unit="%"
                    onChange={(v) =>
                      patch({ lineHeight: typeof v === "number" ? v / 100 : undefined })
                    }
                  />
                  <FieldSlider
                    label="Letter spacing"
                    value={
                      typeof item.letterSpacingEm === "number"
                        ? Math.round(item.letterSpacingEm * 1000)
                        : undefined
                    }
                    min={-50}
                    max={300}
                    step={5}
                    unit="‰"
                    onChange={(v) =>
                      patch({
                        letterSpacingEm: typeof v === "number" ? v / 1000 : undefined,
                      })
                    }
                  />
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Text transform</Label>
                    <Select
                      value={item.textTransform ?? "__none__"}
                      onValueChange={(v) =>
                        patch({
                          textTransform:
                            v === "__none__"
                              ? undefined
                              : (v as SlotItemValue["textTransform"]),
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="uppercase">UPPERCASE</SelectItem>
                        <SelectItem value="lowercase">lowercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Decoration</Label>
                    <Select
                      value={item.textDecoration ?? "__none__"}
                      onValueChange={(v) =>
                        patch({
                          textDecoration:
                            v === "__none__"
                              ? undefined
                              : (v as SlotItemValue["textDecoration"]),
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="underline">Underline</SelectItem>
                        <SelectItem value="line-through">Strike-through</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldColor
                    label="Text color"
                    value={item.textColor ?? ""}
                    onChange={(v) => patch({ textColor: v || undefined })}
                  />
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(item.italic)}
                      onChange={(e) => patch({ italic: e.target.checked })}
                    />
                    Italic
                  </label>
                </>
              )}

              {item.kind === "image" && (
                <>
                  <FieldSlider
                    label="Height"
                    value={item.imageHeight ?? 32}
                    min={8}
                    max={240}
                    step={1}
                    unit="px"
                    onChange={(v) => patch({ imageHeight: v ?? 32 })}
                  />
                  <FieldSlider
                    label="Rounded corners"
                    value={item.imageRoundedPx}
                    min={0}
                    max={120}
                    step={1}
                    unit="px"
                    onChange={(v) => patch({ imageRoundedPx: v })}
                  />
                </>
              )}

              {item.kind === "button" && (
                <>
                  {item.variant === "default" && (
                    <FieldColor
                      label="Background color"
                      value={item.buttonBg ?? ""}
                      onChange={(v) => patch({ buttonBg: v || undefined })}
                    />
                  )}
                  <FieldColor
                    label="Text color"
                    value={item.buttonFg ?? ""}
                    onChange={(v) => patch({ buttonFg: v || undefined })}
                  />
                </>
              )}

              <FieldSlider
                label="Extra horizontal margin"
                value={item.marginX}
                min={0}
                max={64}
                step={1}
                unit="px"
                onChange={(v) => patch({ marginX: v })}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Small field helpers ──────────────────────────────────────────────────

function FieldText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-8"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number | undefined) => void;
}) {
  const isSet = typeof value === "number" && Number.isFinite(value);
  const display = isSet ? `${value}${unit}` : "—";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {display}
          </span>
          {isSet && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onChange(undefined)}
            >
              reset
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={isSet ? value : Math.round((min + max) / 2)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}

function FieldColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0"
        />
        <Input
          className="h-8 flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000 or leave blank"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
