"use client";

import { type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/sheet";

export type SidePanelWidth = "sm" | "md" | "lg";

const WIDTH_CLASS: Record<SidePanelWidth, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
};

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: SidePanelWidth;
  children: ReactNode;
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  width = "md",
  children,
}: SidePanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className={WIDTH_CLASS[width]}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
