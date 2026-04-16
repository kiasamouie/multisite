"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SupabaseFilter {
  field: string;
  operator: "eq" | "ne" | "lt" | "gt" | "lte" | "gte" | "in" | "contains";
  value: unknown;
}

export interface Sorter {
  field: string;
  order: "asc" | "desc";
}

export interface UseSupabaseListOptions<T> {
  resource: string;
  select?: string;
  filters?: SupabaseFilter[];
  sorters?: Sorter[];
  page?: number;
  pageSize?: number;
  enabled?: boolean;
  queryKey?: unknown[];
}

export interface UseSupabaseListResult<T> {
  data: T[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  invalidate: () => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalPages: number;
  sorters: Sorter[];
  setSorters: (s: Sorter[]) => void;
}

export function useSupabaseList<T extends Record<string, unknown>>(
  opts: UseSupabaseListOptions<T>,
): UseSupabaseListResult<T> {
  const {
    resource,
    select = "*",
    filters = [],
    enabled = true,
    queryKey: extraKey = [],
  } = opts;

  const queryClient = useQueryClient();
  const [page, setPage] = useState(opts.page ?? 1);
  const [pageSize, setPageSize] = useState(opts.pageSize ?? 10);
  const [sorters, setSorters] = useState<Sorter[]>(opts.sorters ?? []);

  const queryKey = ["supabase-list", resource, page, pageSize, sorters, filters, select, ...extraKey];

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const supabase = createBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = (supabase as any).from(resource).select(select, { count: "exact" });

      for (const f of filters) {
        if (f.operator === "eq") q = q.eq(f.field, f.value);
        else if (f.operator === "ne") q = q.neq(f.field, f.value);
        else if (f.operator === "contains") q = q.ilike(f.field, `%${String(f.value)}%`);
        else if (f.operator === "lt") q = q.lt(f.field, f.value);
        else if (f.operator === "gt") q = q.gt(f.field, f.value);
        else if (f.operator === "lte") q = q.lte(f.field, f.value);
        else if (f.operator === "gte") q = q.gte(f.field, f.value);
        else if (f.operator === "in") q = q.in(f.field, f.value as unknown[]);
      }

      for (const s of sorters) {
        q = q.order(s.field, { ascending: s.order === "asc" });
      }

      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return { data: (data ?? []) as T[], total: count ?? 0 };
    },
  });

  const total = query.data?.total ?? 0;

  return {
    data: query.data?.data ?? [],
    total,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => query.refetch(),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["supabase-list", resource] }),
    page,
    setPage,
    pageSize,
    setPageSize: (s: number) => { setPageSize(s); setPage(1); },
    totalPages: Math.ceil(total / pageSize) || 1,
    sorters,
    setSorters,
  };
}

// ── useSupabaseItem ──────────────────────────────────────────────────────────

export interface UseSupabaseItemOptions {
  resource: string;
  id: string | number | null;
  select?: string;
  enabled?: boolean;
}

export function useSupabaseItem<T extends Record<string, unknown>>(
  opts: UseSupabaseItemOptions,
) {
  const { resource, id, select = "*", enabled = true } = opts;

  return useQuery({
    queryKey: ["supabase-item", resource, id, select],
    enabled: enabled && id != null,
    queryFn: async () => {
      const supabase = createBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(resource)
        .select(select)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as T;
    },
  });
}

// ── useSupabaseDelete ────────────────────────────────────────────────────────

export function useSupabaseDelete(resource: string) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const deleteRecord = async (id: string | number, customHandler?: (id: string | number) => Promise<void>) => {
    setDeleting(true);
    try {
      if (customHandler) {
        await customHandler(id);
      } else {
        const supabase = createBrowserClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from(resource).delete().eq("id", id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["supabase-list", resource] });
    } finally {
      setDeleting(false);
    }
  };

  return { deleteRecord, deleting };
}

// ── useCrudPanel ─────────────────────────────────────────────────────────────

export type CrudMode = "view" | "create" | "edit";

export interface UseCrudPanelReturn<T> {
  mode: CrudMode;
  item: T | null;
  open: boolean;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  openPanel: (mode: CrudMode, item?: T | null) => void;
  closePanel: () => void;
}

export function useCrudPanel<T>(): UseCrudPanelReturn<T> {
  const [state, setState] = useState<{ mode: CrudMode; item: T | null }>({
    mode: "view",
    item: null,
  });
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openPanel = (mode: CrudMode, item: T | null = null) => {
    setState({ mode, item });
    setOpen(true);
    setSubmitting(false);
  };

  const closePanel = () => {
    setOpen(false);
    setSubmitting(false);
  };

  return {
    mode: state.mode,
    item: state.item,
    open,
    submitting,
    setSubmitting,
    openPanel,
    closePanel,
  };
}
