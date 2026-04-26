"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/cn";
import type { ThemeSettings } from "@repo/lib/site-settings/types";
import { saveSettingsAction } from "../_actions";

// ── Preset themes ────────────────────────────────────────────────────────────

interface PresetPalette {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
}

interface PresetTheme {
  id: string;
  name: string;
  palette: PresetPalette;
}

const PRESETS: PresetTheme[] = [
  {
    id: "default",
    name: "Default",
    palette: { primary: "#2563eb", accent: "#7c3aed", background: "#ffffff", foreground: "#0f172a" },
  },
  {
    id: "ocean",
    name: "Ocean",
    palette: { primary: "#0284c7", accent: "#06b6d4", background: "#f0f9ff", foreground: "#0c4a6e" },
  },
  {
    id: "forest",
    name: "Forest",
    palette: { primary: "#16a34a", accent: "#84cc16", background: "#f0fdf4", foreground: "#14532d" },
  },
  {
    id: "sunset",
    name: "Sunset",
    palette: { primary: "#ea580c", accent: "#f59e0b", background: "#fff7ed", foreground: "#431407" },
  },
  {
    id: "rose",
    name: "Rose",
    palette: { primary: "#e11d48", accent: "#f43f5e", background: "#fff1f2", foreground: "#4c0519" },
  },
  {
    id: "violet",
    name: "Violet",
    palette: { primary: "#7c3aed", accent: "#a855f7", background: "#faf5ff", foreground: "#2e1065" },
  },
  {
    id: "midnight",
    name: "Midnight",
    palette: { primary: "#818cf8", accent: "#a78bfa", background: "#0f172a", foreground: "#e2e8f0" },
  },
  {
    id: "slate",
    name: "Slate",
    palette: { primary: "#475569", accent: "#64748b", background: "#f8fafc", foreground: "#0f172a" },
  },
  {
    id: "amber",
    name: "Amber",
    palette: { primary: "#d97706", accent: "#f59e0b", background: "#fffbeb", foreground: "#451a03" },
  },
  {
    id: "ruby",
    name: "Ruby",
    palette: { primary: "#dc2626", accent: "#b91c1c", background: "#fef2f2", foreground: "#450a0a" },
  },
];

// ── Fonts ────────────────────────────────────────────────────────────────────

const SAFE_FONTS = [
  { value: "", label: "System default" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "system-ui, sans-serif", label: "System UI" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ThemeFormProps {
  initial: ThemeSettings;
}

export function ThemeForm({ initial }: ThemeFormProps) {
  const [pending, startTransition] = useTransition();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [primary, setPrimary] = useState(initial.palette?.primary ?? "");
  const [accent, setAccent] = useState(initial.palette?.accent ?? "");
  const [background, setBackground] = useState(initial.palette?.background ?? "");
  const [foreground, setForeground] = useState(initial.palette?.foreground ?? "");
  const [fontFamily, setFontFamily] = useState(initial.font?.family ?? "");

  const applyPreset = (preset: PresetTheme) => {
    setActivePreset(preset.id);
    setPrimary(preset.palette.primary);
    setAccent(preset.palette.accent);
    setBackground(preset.palette.background);
    setForeground(preset.palette.foreground);
  };

  const onSave = () => {
    const next: ThemeSettings = {
      palette: {
        primary: primary || undefined,
        accent: accent || undefined,
        background: background || undefined,
        foreground: foreground || undefined,
      },
      font: {
        family: fontFamily || undefined,
      },
    };
    startTransition(async () => {
      const res = await saveSettingsAction("theme", next);
      if (res.ok) toast.success("Theme saved");
      else toast.error(`Save failed: ${res.error}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Preset themes ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preset themes</CardTitle>
          <CardDescription>
            Click a theme to apply it. You can still fine-tune the colours
            below before saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-lg border-2 transition-all",
                  activePreset === preset.id
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50",
                )}
              >
                {/* Colour swatch */}
                <div
                  className="flex h-16 w-full items-center justify-center gap-1.5 px-2"
                  style={{ background: preset.palette.background }}
                >
                  <span
                    className="h-6 w-6 rounded-full shadow-sm"
                    style={{ background: preset.palette.primary }}
                  />
                  <span
                    className="h-6 w-6 rounded-full shadow-sm"
                    style={{ background: preset.palette.accent }}
                  />
                  <span
                    className="h-4 w-4 rounded-full opacity-50"
                    style={{ background: preset.palette.foreground }}
                  />
                </div>
                {/* Label */}
                <div
                  className="px-2 py-1.5 text-center text-xs font-semibold text-white"
                  style={{ background: preset.palette.primary }}
                >
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Custom palette ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colours</CardTitle>
          <CardDescription>
            Fine-tune individual colours. Use the preset above to start from a
            named theme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ColorRow
            label="Primary"
            value={primary}
            onChange={(v) => { setPrimary(v); setActivePreset(null); }}
            placeholder="#2563eb"
          />
          <ColorRow
            label="Accent"
            value={accent}
            onChange={(v) => { setAccent(v); setActivePreset(null); }}
            placeholder="#7c3aed"
          />
          <ColorRow
            label="Background"
            value={background}
            onChange={(v) => { setBackground(v); setActivePreset(null); }}
            placeholder="#ffffff"
          />
          <ColorRow
            label="Foreground / text"
            value={foreground}
            onChange={(v) => { setForeground(v); setActivePreset(null); }}
            placeholder="#0f172a"
          />
        </CardContent>
      </Card>

      {/* ── Typography ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Typography</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="font" className="w-32 shrink-0">
              Font family
            </Label>
            <Select
              value={fontFamily || "__default__"}
              onValueChange={(v) => setFontFamily(v === "__default__" ? "" : v)}
            >
              <SelectTrigger id="font" className="w-72">
                <SelectValue placeholder="System default" />
              </SelectTrigger>
              <SelectContent>
                {SAFE_FONTS.map((f) => (
                  <SelectItem key={f.label} value={f.value || "__default__"}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

// ── ColorRow helper ──────────────────────────────────────────────────────────

function isHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function ColorRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-36 shrink-0">{label}</Label>
      <input
        type="color"
        value={isHex(value) ? value : "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent"
        aria-label={`${label} colour swatch`}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="max-w-[12rem] font-mono text-sm"
      />
    </div>
  );
}
