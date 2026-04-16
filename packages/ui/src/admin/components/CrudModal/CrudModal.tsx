"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import type { CrudModalProps, CrudModalSize } from "./crud-modal-types";

const sizeClass: Record<CrudModalSize, string> = {
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-6xl",
  full: "sm:max-w-[90vw]",
};

export function CrudModal({
  open,
  onOpenChange,
  mode,
  title,
  description,
  size = "lg",
  children,
  onSubmit,
  submitting = false,
  submitLabel,
  footerActions,
}: CrudModalProps) {
  const isEditable = mode === "create" || mode === "edit";
  const defaultLabel = mode === "create" ? "Create" : "Save Changes";

  const header = (
    <DialogHeader>
      <DialogTitle>{title ?? (mode === "create" ? "Create" : mode === "edit" ? "Edit" : "Details")}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
    </DialogHeader>
  );

  const footer = (
    <DialogFooter className="mt-4 border-t border-[hsl(var(--border)/0.1)] pt-4">
      {footerActions}
      <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
        {isEditable ? "Cancel" : "Close"}
      </Button>
      {isEditable && (
        <Button type="submit" disabled={submitting} form={isEditable ? "crud-modal-form" : undefined}>
          {submitting ? "Saving..." : (submitLabel ?? defaultLabel)}
        </Button>
      )}
    </DialogFooter>
  );

  const body = (
    <div className="flex-1 overflow-y-auto max-h-[70vh] py-2">
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClass[size]} flex flex-col overflow-hidden`}>
        {isEditable && onSubmit ? (
          <form id="crud-modal-form" onSubmit={onSubmit} className="flex flex-col">
            {header}
            {body}
            {footer}
          </form>
        ) : (
          <>
            {header}
            {body}
            {footer}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
