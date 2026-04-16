"use client";

import type { ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { X, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

export interface FilterOption {
  label: string;
  value: string;
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

export type FilterItemConfig = SelectFilterConfig | TextFilterConfig | DateFilterConfig;

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

function renderFilterItem(f: FilterItemConfig, i: number): ReactNode {
  let input: ReactNode;
  if (!f.type || f.type === "select") {
    const sf = f as SelectFilterConfig;
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
  } else if (f.type === "text") {
    input = (
      <Input
        value={f.value}
        onChange={e => f.onChange(e.target.value)}
        placeholder={f.placeholder}
        className="h-8 text-sm"
        style={f.width ? { width: f.width } : undefined}
      />
    );
  } else {
    input = (
      <Input
        type="date"
        value={f.value}
        onChange={e => f.onChange(e.target.value)}
        className="h-8 text-sm"
        style={f.width ? { width: f.width } : undefined}
      />
    );
  }

  if (f.label) {
    return (
      <div key={i} className="flex flex-col gap-1" style={f.width ? { minWidth: f.width } : { minWidth: "130px" }}>
        <Label className="text-xs text-muted-foreground">{f.label}</Label>
        {input}
      </div>
    );
  }
  return <div key={i}>{input}</div>;
}

function FilterBarRenderer({
  search,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  hasFilters,
  onClear,
  children,
}: BarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      {search !== undefined && onSearchChange && (
        <div className="relative group flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={searchPlaceholder ?? "Search..."}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>
      )}
      {filters.map((f, i) => renderFilterItem(f, i))}
      {hasFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1.5 text-xs">
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
      {children}
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
