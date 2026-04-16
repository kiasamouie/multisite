import type { ReactNode } from "react";

export interface DetailLayoutProps {
  main: ReactNode;
  sidebar: ReactNode;
}

export function DetailLayout({ main, sidebar }: DetailLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">{main}</div>
      <div className="lg:col-span-4 space-y-4">{sidebar}</div>
    </div>
  );
}
