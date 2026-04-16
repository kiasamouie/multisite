import type { ReactNode, FormEvent } from "react";

export type CrudMode = "view" | "create" | "edit";
export type CrudModalSize = "md" | "lg" | "xl" | "full";

export interface CrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CrudMode;
  title?: string;
  description?: string;
  size?: CrudModalSize;
  children: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  submitting?: boolean;
  submitLabel?: string;
  footerActions?: ReactNode;
}
