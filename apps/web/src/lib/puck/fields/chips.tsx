"use client";

/**
 * Puck custom-render factories backed by the @repo/ui `Filter` chips
 * component. These give us a consistent, branded "pill" UI for boolean
 * toggles and small enum selectors across all block types — replacing
 * Puck's default radio/select chrome.
 */

import { Filter } from "@repo/ui/admin";

interface PuckRenderProps<T> {
  value: T;
  onChange: (v: T) => void;
  /** Puck passes the full field definition as `field` to every custom render. */
  field?: { label?: string };
}

export interface ChipOption<T> {
  label: string;
  value: T;
}

/**
 * Render a single-select chips picker. Equivalent to Puck's `select` /
 * `radio` field, but using the design-system Filter pill UI.
 *
 * The factory boxes/unboxes values using `JSON.stringify` so it can carry
 * any primitive type (boolean, number, string) through Filter's string-only
 * chip API.
 */
export function createChipsFieldRender<T extends string | number | boolean>(
  options: ChipOption<T>[],
  fallback: T,
) {
  const encode = (v: T): string => JSON.stringify(v);
  const decode = (s: string): T => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  };

  const filterOptions = options.map((o) => ({ value: encode(o.value), label: o.label }));

  return function ChipsField({ value, onChange, field }: PuckRenderProps<T>) {
    const current = encode(value ?? fallback);
    return (
      <div className="space-y-1.5">
        {field?.label && (
          <div className="text-xs font-medium text-foreground">{field.label}</div>
        )}
        <Filter
          type="bar"
          filters={[
            {
              type: "chips",
              multi: false,
              inline: true,
              showAll: false,
              value: current,
              onChange: (v) => onChange(decode(v)),
              options: filterOptions,
            },
          ]}
        />
      </div>
    );
  };
}

/** Convenience: a yes / no boolean chip selector. */
export function createBooleanChipsRender(fallback = false) {
  return createChipsFieldRender<boolean>(
    [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
    fallback,
  );
}

/** Convenience: a yes / no string-encoded boolean chip selector
 *  (some blocks use "true" / "false" string values). */
export function createStringBooleanChipsRender(fallback = "false") {
  return createChipsFieldRender<string>(
    [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
    fallback,
  );
}
