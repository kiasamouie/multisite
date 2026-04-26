"use client";

/**
 * StyledFieldEditor — generic "content + style" editor.
 *
 * Renders the caller-supplied input (text, textarea, media picker, …) and
 * appends a collapsible "Style" panel with controls appropriate to the
 * given `kind`. Used by any Puck block field that wants per-element
 * styling (color, size, weight, alignment, padding, etc.).
 *
 * Value shape is `{ value: T, style?: ContentStyle }`. This keeps the
 * existing field key on the block and only changes the value type.
 */

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
import { Separator } from "../ui/separator";
import { ChevronDown, ChevronRight } from "lucide-react";

// ── Types (duplicated in @repo/template/lib/content-style.ts) ───────────

export type ContentStyleKind =
  | "text"
  | "heading"
  | "image"
  | "video"
  | "button"
  | "section";

export interface ContentStyle {
  color?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  fontSizePx?: number;
  weight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  italic?: boolean;
  align?: "left" | "center" | "right";
  fontFamily?: string;
  lineHeight?: number;
  letterSpacingEm?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  backgroundColor?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  borderRadius?: number;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  paddingY?: "none" | "sm" | "md" | "lg" | "xl";
  paddingX?: "none" | "sm" | "md" | "lg" | "xl";
  paddingYPx?: number;
  paddingXPx?: number;
  selfAlign?: "left" | "center" | "right";
  height?: number;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "21/9";
  variant?: "default" | "outline" | "ghost";
}

export interface StyledValue<T> {
  value: T;
  style?: ContentStyle;
}

// ── Public component ────────────────────────────────────────────────────

export interface StyledFieldEditorProps<T> {
  /** Current value: `{ value, style? }` (legacy bare values are accepted). */
  value: StyledValue<T> | T | null | undefined;
  onChange: (next: StyledValue<T>) => void;
  /** Which control surface to show. Determines available style fields. */
  kind: ContentStyleKind;
  /** Label shown above the content input. */
  label?: string;
  /**
   * Caller renders the actual content input (text, image picker, etc.).
   * Receives the inner value and a setter that mutates only `value`.
   */
  renderInput: (inner: T, setInner: (v: T) => void) => ReactNode;
  /** Default inner value when migrating from legacy bare values. */
  defaultInner: T;
  /** Hide the Style panel (rare — useful when only the input matters). */
  hideStyle?: boolean;
  /** Initially expanded? Defaults to false (collapsed). */
  styleOpen?: boolean;
}

export function StyledFieldEditor<T>({
  value,
  onChange,
  kind,
  label,
  renderInput,
  defaultInner,
  hideStyle = false,
  styleOpen = false,
}: StyledFieldEditorProps<T>) {
  // Normalise: accept `{ value, style }` OR a bare legacy value.
  const normalised: StyledValue<T> = isWrapped<T>(value)
    ? value
    : { value: (value as T) ?? defaultInner };

  const [open, setOpen] = useState(styleOpen);

  const setInner = (v: T) => onChange({ ...normalised, value: v });
  const setStyle = (s: ContentStyle) =>
    onChange({ ...normalised, style: cleanStyle(s) });
  const patch = (p: Partial<ContentStyle>) =>
    setStyle({ ...(normalised.style ?? {}), ...p });

  return (
    <div className="grid gap-2">
      {label && <Label className="text-xs">{label}</Label>}
      {renderInput(normalised.value, setInner)}

      {!hideStyle && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start h-7 px-2 text-xs"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Style
          </Button>
          {open && (
            <>
              <Separator />
              <StyleControls
                kind={kind}
                value={normalised.style ?? {}}
                onPatch={patch}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function isWrapped<T>(v: unknown): v is StyledValue<T> {
  return (
    typeof v === "object" &&
    v !== null &&
    "value" in (v as Record<string, unknown>)
  );
}

function cleanStyle(s: ContentStyle): ContentStyle | undefined {
  // Drop empty strings / undefined to keep the persisted blob minimal.
  const out: ContentStyle = {};
  for (const [k, val] of Object.entries(s)) {
    if (val === "" || val === undefined || val === null) continue;
    (out as Record<string, unknown>)[k] = val;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

// ── Style controls ──────────────────────────────────────────────────────

interface StyleControlsProps {
  kind: ContentStyleKind;
  value: ContentStyle;
  onPatch: (p: Partial<ContentStyle>) => void;
}

function StyleControls({ kind, value, onPatch }: StyleControlsProps) {
  const showTypography =
    kind === "text" || kind === "heading" || kind === "button";
  const showLayout = kind === "section";
  const showSelfAlign = kind === "image" || kind === "video";
  const showAspect = kind === "image" || kind === "video";
  const showButton = kind === "button";
  // Background colour applies to every "box" kind including sections.
  const showBackground =
    kind === "section" ||
    kind === "button" ||
    kind === "image" ||
    kind === "video";
  // Rounded corners + shadow only make sense on contained elements
  // (buttons, images, videos). They look strange on a full-width section.
  const showRoundedShadow =
    kind === "button" || kind === "image" || kind === "video";

  return (
    <div className="flex flex-col gap-3 pl-1">
      {showTypography && (
        <>
          <FontFamilyField
            value={value.fontFamily ?? ""}
            onChange={(v) => onPatch({ fontFamily: v || undefined })}
          />
          <SliderField
            label="Font size"
            value={value.fontSizePx}
            min={8}
            max={96}
            step={1}
            unit="px"
            onChange={(v) => onPatch({ fontSizePx: v })}
          />
          <SelectField
            label="Weight"
            value={value.weight ?? ""}
            options={[
              ["", "—"],
              ["normal", "Normal"],
              ["medium", "Medium"],
              ["semibold", "Semibold"],
              ["bold", "Bold"],
              ["extrabold", "Extra-bold"],
            ]}
            onChange={(v) => onPatch({ weight: (v || undefined) as ContentStyle["weight"] })}
          />
          <SelectField
            label="Alignment"
            value={value.align ?? ""}
            options={[
              ["", "—"],
              ["left", "Left"],
              ["center", "Center"],
              ["right", "Right"],
            ]}
            onChange={(v) => onPatch({ align: (v || undefined) as ContentStyle["align"] })}
          />
          <SliderField
            label="Line height"
            value={
              typeof value.lineHeight === "number"
                ? Math.round(value.lineHeight * 100)
                : undefined
            }
            min={80}
            max={250}
            step={5}
            unit="%"
            onChange={(v) =>
              onPatch({ lineHeight: typeof v === "number" ? v / 100 : undefined })
            }
          />
          <SliderField
            label="Letter spacing"
            value={
              typeof value.letterSpacingEm === "number"
                ? Math.round(value.letterSpacingEm * 1000)
                : undefined
            }
            min={-50}
            max={300}
            step={5}
            unit="‰"
            onChange={(v) =>
              onPatch({
                letterSpacingEm: typeof v === "number" ? v / 1000 : undefined,
              })
            }
          />
          <SelectField
            label="Text transform"
            value={value.textTransform ?? ""}
            options={[
              ["", "—"],
              ["none", "None"],
              ["uppercase", "UPPERCASE"],
              ["lowercase", "lowercase"],
              ["capitalize", "Capitalize"],
            ]}
            onChange={(v) =>
              onPatch({
                textTransform: (v || undefined) as ContentStyle["textTransform"],
              })
            }
          />
          <SelectField
            label="Decoration"
            value={value.textDecoration ?? ""}
            options={[
              ["", "—"],
              ["none", "None"],
              ["underline", "Underline"],
              ["line-through", "Strike-through"],
            ]}
            onChange={(v) =>
              onPatch({
                textDecoration: (v || undefined) as ContentStyle["textDecoration"],
              })
            }
          />
          <ColorField
            label="Text color"
            value={value.color ?? ""}
            onChange={(v) => onPatch({ color: v || undefined })}
          />
          <CheckboxField
            label="Italic"
            value={Boolean(value.italic)}
            onChange={(v) => onPatch({ italic: v || undefined })}
          />
        </>
      )}

      {showSelfAlign && (
        <SelectField
          label="Alignment"
          value={value.selfAlign ?? ""}
          options={[
            ["", "—"],
            ["left", "Left"],
            ["center", "Center"],
            ["right", "Right"],
          ]}
          onChange={(v) =>
            onPatch({ selfAlign: (v || undefined) as ContentStyle["selfAlign"] })
          }
        />
      )}

      {showAspect && (
        <>
          <SelectField
            label="Aspect ratio"
            value={value.aspectRatio ?? ""}
            options={[
              ["", "— (natural)"],
              ["16/9", "16:9"],
              ["4/3", "4:3"],
              ["1/1", "Square"],
              ["21/9", "Cinematic"],
            ]}
            onChange={(v) =>
              onPatch({
                aspectRatio: (v || undefined) as ContentStyle["aspectRatio"],
              })
            }
          />
          <SliderField
            label="Height"
            value={value.height}
            min={40}
            max={1000}
            step={4}
            unit="px"
            onChange={(v) => onPatch({ height: v })}
          />
        </>
      )}

      {showButton && (
        <SelectField
          label="Variant"
          value={value.variant ?? ""}
          options={[
            ["", "—"],
            ["default", "Filled"],
            ["outline", "Outline"],
            ["ghost", "Ghost"],
          ]}
          onChange={(v) =>
            onPatch({ variant: (v || undefined) as ContentStyle["variant"] })
          }
        />
      )}

      {showLayout && (
        <>
          <SelectField
            label="Max width"
            value={value.maxWidth ?? ""}
            options={[
              ["", "—"],
              ["sm", "Small"],
              ["md", "Medium"],
              ["lg", "Large"],
              ["xl", "X-Large"],
              ["2xl", "2XL"],
              ["full", "Full"],
            ]}
            onChange={(v) =>
              onPatch({ maxWidth: (v || undefined) as ContentStyle["maxWidth"] })
            }
          />
          <SliderField
            label="Vertical padding"
            value={value.paddingYPx}
            min={0}
            max={200}
            step={2}
            unit="px"
            onChange={(v) => onPatch({ paddingYPx: v })}
          />
          <SliderField
            label="Horizontal padding"
            value={value.paddingXPx}
            min={0}
            max={200}
            step={2}
            unit="px"
            onChange={(v) => onPatch({ paddingXPx: v })}
          />
        </>
      )}

      {/* Rounded + shadow — only for kinds rendered as a contained element */}
      {showRoundedShadow && (
        <>
          <SliderField
            label="Rounded corners"
            value={value.borderRadius}
            min={0}
            max={120}
            step={1}
            unit="px"
            onChange={(v) => onPatch({ borderRadius: v })}
          />
          <SelectField
            label="Shadow"
            value={value.shadow ?? ""}
            options={[
              ["", "—"],
              ["none", "None"],
              ["sm", "Small"],
              ["md", "Medium"],
              ["lg", "Large"],
              ["xl", "X-Large"],
            ]}
            onChange={(v) =>
              onPatch({ shadow: (v || undefined) as ContentStyle["shadow"] })
            }
          />
        </>
      )}

      {/* Background colour — every visible-box kind including sections */}
      {showBackground && (
        <ColorField
          label="Background"
          value={value.backgroundColor ?? ""}
          onChange={(v) => onPatch({ backgroundColor: v || undefined })}
        />
      )}
    </div>
  );
}

// ── Atoms ───────────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (v: string) => void;
}) {
  // Select can't have empty string value — use sentinel.
  const SENTINEL = "__none__";
  const v = value === "" ? SENTINEL : value;
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={v}
        onValueChange={(next) =>
          onChange(next === SENTINEL ? "" : next)
        }
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([val, lbl]) => (
            <SelectItem key={val || SENTINEL} value={val === "" ? SENTINEL : val}>
              {lbl}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ColorField({
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

function SliderField({
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

function CheckboxField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// ── Font family ─────────────────────────────────────────────────────────
//
// Curated list of font stacks. Fonts are loaded via `next/font/google` in
// `apps/web/src/app/layout.tsx` and exposed as CSS custom properties on
// `<body>` (e.g. `--font-inter`). We reference those variables first and
// fall back to the literal font name + a generic family so the dropdown
// preview also renders correctly inside isolated contexts.

const FONT_FAMILIES: Array<{
  value: string;
  label: string;
  category: "Sans-serif" | "Serif" | "Display" | "Monospace";
}> = [
  { value: 'var(--font-manrope), "Manrope", ui-sans-serif, system-ui, sans-serif', label: "Manrope (default)", category: "Sans-serif" },
  { value: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif', label: "Inter", category: "Sans-serif" },
  { value: 'var(--font-roboto), "Roboto", ui-sans-serif, system-ui, sans-serif', label: "Roboto", category: "Sans-serif" },
  { value: 'var(--font-poppins), "Poppins", ui-sans-serif, system-ui, sans-serif', label: "Poppins", category: "Sans-serif" },
  { value: 'var(--font-montserrat), "Montserrat", ui-sans-serif, system-ui, sans-serif', label: "Montserrat", category: "Sans-serif" },
  { value: 'var(--font-lora), "Lora", ui-serif, Georgia, serif', label: "Lora", category: "Serif" },
  { value: 'var(--font-playfair), "Playfair Display", ui-serif, Georgia, serif', label: "Playfair Display", category: "Serif" },
  { value: 'var(--font-merriweather), "Merriweather", ui-serif, Georgia, serif', label: "Merriweather", category: "Serif" },
  { value: 'var(--font-oswald), "Oswald", ui-sans-serif, system-ui, sans-serif', label: "Oswald", category: "Display" },
  { value: 'var(--font-bebas), "Bebas Neue", ui-sans-serif, system-ui, sans-serif', label: "Bebas Neue", category: "Display" },
  { value: 'var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', label: "JetBrains Mono", category: "Monospace" },
];

function FontFamilyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const SENTINEL = "__none__";
  const v = value === "" ? SENTINEL : value;

  // Group options by category for the dropdown.
  const groups = FONT_FAMILIES.reduce<Record<string, typeof FONT_FAMILIES>>(
    (acc, opt) => {
      (acc[opt.category] ??= []).push(opt);
      return acc;
    },
    {},
  );

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">Font family</Label>
      <Select
        value={v}
        onValueChange={(next) => onChange(next === SENTINEL ? "" : next)}
      >
        <SelectTrigger className="h-8" style={value ? { fontFamily: value } : undefined}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL}>—</SelectItem>
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {cat}
              </div>
              {items.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  style={{ fontFamily: opt.value }}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
