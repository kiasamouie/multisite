import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";

export interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
  backHref?: string;
}

export function PageHeader({ title, actions, backHref }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {backHref && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
        )}
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
