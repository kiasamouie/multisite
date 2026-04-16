import type { ComponentType, ReactNode } from "react";
import { Inbox, Loader2 } from "lucide-react";

export interface EmptyStateProps {
  message?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  loading?: boolean;
}

export function EmptyState({ message = "No results found", icon: Icon = Inbox, action, loading = false }: EmptyStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{message === "No results found" ? "Loading..." : message}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return <EmptyState loading message={message} />;
}
