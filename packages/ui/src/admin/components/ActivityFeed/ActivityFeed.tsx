import Link from "next/link";
import { cn } from "../../../lib/cn";

export interface ActivityFeedItem {
  id: string | number;
  title: string;
  timestamp?: string | null;
  status?: string;
  description?: string;
  href?: string;
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[];
  emptyMessage?: string;
  className?: string;
}

function statusDotClass(status?: string): string {
  switch (status) {
    case "completed":
      return "bg-[hsl(var(--success))]";
    case "failed":
      return "bg-destructive";
    case "running":
      return "bg-[hsl(var(--secondary))] animate-pulse";
    case "pending":
    case "queued":
      return "bg-[hsl(var(--warning))]";
    default:
      return "bg-muted-foreground";
  }
}

function formatTimestamp(ts?: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleString();
}

function FeedRow({ item }: { item: ActivityFeedItem }) {
  const inner = (
    <>
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", statusDotClass(item.status))} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
        )}
        {item.timestamp && (
          <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(item.timestamp)}</p>
        )}
      </div>
    </>
  );

  const rowClass = "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50";

  if (item.href) {
    return (
      <Link href={item.href} className={rowClass}>
        {inner}
      </Link>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}

export function ActivityFeed({ items, emptyMessage = "No activity yet", className }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground px-3 py-4", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {items.map(item => (
        <FeedRow key={item.id} item={item} />
      ))}
    </div>
  );
}
