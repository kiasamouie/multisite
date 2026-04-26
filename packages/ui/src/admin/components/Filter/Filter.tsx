"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { X, Search, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { cn } from "../../../lib/cn";

export interface FilterOption {
  label: string;
  value: string;
  /** Optional count shown inside the chip or combobox option */
  count?: number;
  /** Optional color tokens for the chips filter active state */
  color?: { bg: string; text: string; border: string };
}

export type SelectFilterConfig = {
  type?: "select";
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
  width?: string;
};

export type TextFilterConfig = {
  type: "text";
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
};

export type DateFilterConfig = {
  type: "date";
  label?: string;
  value: string;
  onChange: (v: string) => void;
  width?: string;
};

/**
 * A searchable dropdown that lets the user type to filter options and pick one.
 * Renders inline with other bar filters.
 */
export type ComboboxFilterConfig = {
  type: "combobox";
  label?: string;
  /** Currently selected option value, "" = none selected */
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  width?: string;
};

/**
 * A full-width row of pill chips — one per option — for quick filtering.
 * Supports single-select (default) and multi-select (`multi: true`) modes.
 * In multi mode, the "All" chip is mutually exclusive with other selections.
 * Rendered below the inline filter row, or inline when `inline: true`.
 */
export type ChipsFilterConfig =
  | {
      type: "chips";
      multi?: false;
      label?: string;
      /** Currently active chip value, "" = "All" (no filter) */
      value: string;
      onChange: (v: string) => void;
      options: FilterOption[];
      showAll?: boolean;
      allLabel?: string;
      inline?: boolean;
    }
  | {
      type: "chips";
      multi: true;
      label?: string;
      /** Currently active chip values, [] = "All" (no filter) */
      value: string[];
      onChange: (v: string[]) => void;
      options: FilterOption[];
      showAll?: boolean;
      allLabel?: string;
      inline?: boolean;
    };

export type FilterItemConfig =
  | SelectFilterConfig
  | TextFilterConfig
  | DateFilterConfig
  | ComboboxFilterConfig
  | ChipsFilterConfig;

interface BarProps {
  type: "bar";
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterItemConfig[];
  hasFilters?: boolean;
  onClear?: () => void;
  children?: ReactNode;
}

interface TabsProps {
  type: "tabs";
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface SelectProps {
  type: "select";
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  width?: string;
  placeholder?: string;
}

export type FilterProps = BarProps | TabsProps | SelectProps;

const CLEAR_SENTINEL = "__clear__";

// ─── Combobox filter ─────────────────────────────────────────────────────────

function ComboboxFilter({ config }: { config: ComboboxFilterConfig }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectedLabel = config.options.find(o => o.value === config.value)?.label;

  const filtered = search.trim()
    ? config.options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : config.options;

  const handleSelect = (value: string) => {
    config.onChange(config.value === value ? "" : value);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    config.onChange("");
    setOpen(false);
    setSearch("");
  };

  const trigger = (
    <button
      type="button"
      onClick={() => { setOpen(o => !o); setSearch(""); }}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        open && "ring-1 ring-ring",
      )}
    >
      <span className={cn("truncate text-sm", !selectedLabel && "text-muted-foreground")}>
        {selectedLabel ?? config.placeholder ?? "Select…"}
      </span>
      <span className="ml-2 flex shrink-0 items-center gap-1">
        {config.value && (
          <span
            onClick={handleClear}
            className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </span>
    </button>
  );

  const dropdown = open && (
    <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[180px] overflow-hidden rounded-md border border-border bg-popover shadow-md">
      <div className="border-b border-border p-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={config.searchPlaceholder ?? "Search…"}
            className="h-7 pl-7 text-xs"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results</p>
        ) : (
          filtered.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelect(o.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                config.value === o.value && "bg-accent/50 font-medium",
              )}
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                  config.value === o.value ? "border-primary" : "border-muted-foreground/30",
                )}
              >
                {config.value === o.value && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </span>
              <span className="truncate">{o.label}</span>
              {o.count !== undefined && (
                <span className="ml-auto text-xs text-muted-foreground">{o.count}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className="relative flex flex-col gap-1"
      style={config.width ? { width: config.width } : { minWidth: "160px" }}
    >
      {config.label && (
        <Label className="text-xs text-muted-foreground">{config.label}</Label>
      )}
      {trigger}
      {dropdown}
    </div>
  );
}

// ─── Chips filter ─────────────────────────────────────────────────────────────

function ChipsFilterRenderer({ config }: { config: ChipsFilterConfig }) {
  const showAll = config.showAll !== false;
  const allLabel = config.allLabel ?? "All";
  const isMulti = config.multi === true;

  const totalCount = config.options.reduce((sum, o) => sum + (o.count ?? 0), 0);
  const allOption: FilterOption = {
    value: "",
    label: allLabel,
    count: totalCount > 0 ? totalCount : undefined,
  };

  const items: FilterOption[] = showAll ? [allOption, ...config.options] : config.options;

  const handleClick = (optValue: string) => {
    if (!isMulti) {
      (config as Extract<ChipsFilterConfig, { multi?: false }>).onChange(optValue);
      return;
    }
    const multiConfig = config as Extract<ChipsFilterConfig, { multi: true }>;
    const current = multiConfig.value;
    if (optValue === "") {
      // "All" clears selection
      multiConfig.onChange([]);
    } else {
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue];
      multiConfig.onChange(next);
    }
  };

  const isActive = (optValue: string): boolean => {
    if (!isMulti) {
      return (config as Extract<ChipsFilterConfig, { multi?: false }>).value === optValue;
    }
    const vals = (config as Extract<ChipsFilterConfig, { multi: true }>).value;
    if (optValue === "") return vals.length === 0;
    return vals.includes(optValue);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {config.label && (
        <span className="mr-1 text-xs text-muted-foreground">{config.label}:</span>
      )}
      {items.map(opt => {
        const active = isActive(opt.value);
        const hasColor = !!opt.color;

        return (
          <button
            key={opt.value === "" ? "__all__" : opt.value}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
              active && !hasColor && "border-primary/40 bg-primary/10 text-primary shadow-sm",
              !active && "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
            )}
            style={active && hasColor ? {
              background: opt.color!.bg,
              color: opt.color!.text,
              borderColor: opt.color!.border,
            } : undefined}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                active && !hasColor && "bg-primary",
                !active && "bg-muted-foreground/50",
              )}
              style={active && hasColor ? { background: opt.color!.text } : undefined}
            />
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                  active ? "bg-black/10" : "bg-muted text-muted-foreground",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Inline filter item renderer ─────────────────────────────────────────────

function renderFilterItem(f: FilterItemConfig, i: number): ReactNode {
  // chips without inline: true are rendered as a separate row — skip here
  if (f.type === "chips" && !f.inline) return null;

  // inline chips — render the ChipsFilterRenderer directly in the flex row
  if (f.type === "chips" && f.inline) {
    return <ChipsFilterRenderer key={i} config={f} />;
  }

  // combobox needs its own state — delegate to a component
  if (f.type === "combobox") {
    return <ComboboxFilter key={i} config={f} />;
  }

  // At this point f is narrowed to select | text | date, which all share `width`
  const sf2 = f as SelectFilterConfig | TextFilterConfig | DateFilterConfig;
  let input: ReactNode;
  if (!sf2.type || sf2.type === "select") {
    const sf = sf2 as SelectFilterConfig;
    const selectValue = sf.value === "" ? CLEAR_SENTINEL : sf.value;
    const handleChange = (v: string) => sf.onChange(v === CLEAR_SENTINEL ? "" : v);
    input = (
      <Select value={selectValue} onValueChange={handleChange}>
        <SelectTrigger className={sf.width ?? "w-40"}>
          <SelectValue placeholder={sf.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {sf.options.map(o => (
            <SelectItem key={o.value || CLEAR_SENTINEL} value={o.value || CLEAR_SENTINEL}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (sf2.type === "text") {
    input = (
      <Input
        value={sf2.value}
        onChange={e => sf2.onChange(e.target.value)}
        placeholder={sf2.placeholder}
        className="h-8 text-sm"
        style={sf2.width ? { width: sf2.width } : undefined}
      />
    );
  } else {
    // date
    input = (
      <Input
        type="date"
        value={sf2.value}
        onChange={e => sf2.onChange(e.target.value)}
        className="h-8 text-sm"
        style={sf2.width ? { width: sf2.width } : undefined}
      />
    );
  }

  if (sf2.label) {
    return (
      <div key={i} className="flex flex-col gap-1" style={sf2.width ? { minWidth: sf2.width } : { minWidth: "130px" }}>
        <Label className="text-xs text-muted-foreground">{sf2.label}</Label>
        {input}
      </div>
    );
  }
  return <div key={i}>{input}</div>;
}

// ─── Bar filter renderer ──────────────────────────────────────────────────────

function FilterBarRenderer({
  search,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  hasFilters,
  onClear,
  children,
}: BarProps) {
  // Local draft keeps the input responsive on every keystroke.
  // The parent is notified via a 300 ms debounce to avoid triggering a
  // re-render + DB query on every character, which would also lose focus.
  const [draftSearch, setDraftSearch] = useState(search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if the parent externally resets the value (e.g. clear button / tab change).
  useEffect(() => {
    setDraftSearch(search ?? "");
  }, [search]);

  const handleSearchChange = (value: string) => {
    setDraftSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 300);
  };
  const inlineFilters = filters.filter(f => f.type !== "chips" || (f as ChipsFilterConfig).inline);
  const chipFilters = filters.filter((f): f is ChipsFilterConfig => f.type === "chips" && !f.inline);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        {search !== undefined && onSearchChange && (
          <div className="relative group flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={searchPlaceholder ?? "Search..."}
              value={draftSearch}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>
        )}
        {inlineFilters.map((f, i) => renderFilterItem(f, i))}
        {hasFilters && onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        {children}
      </div>
      {chipFilters.map((f, i) => (
        <ChipsFilterRenderer key={i} config={f} />
      ))}
    </div>
  );
}

function FilterTabsRenderer({ options, value, onChange, className }: TabsProps) {
  return (
    <div className={`bg-[hsl(var(--surface-low))] p-1 rounded-xl flex items-center ${className ?? ""}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === opt.value
              ? "bg-[hsl(var(--surface-container))] text-primary shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FilterSelectRenderer({ options, value, onChange, width = "w-40", placeholder }: SelectProps) {
  const selectValue = value === "" ? CLEAR_SENTINEL : value;
  const handleChange = (v: string) => onChange(v === CLEAR_SENTINEL ? "" : v);

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger className={width}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value || CLEAR_SENTINEL} value={o.value || CLEAR_SENTINEL}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Filter(props: FilterProps) {
  switch (props.type) {
    case "bar":
      return <FilterBarRenderer {...props} />;
    case "tabs":
      return <FilterTabsRenderer {...props} />;
    case "select":
      return <FilterSelectRenderer {...props} />;
  }
}
