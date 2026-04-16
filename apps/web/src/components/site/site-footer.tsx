import Link from "next/link";

interface SiteFooterProps {
  tenantName: string;
}

export function SiteFooter({ tenantName }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-[var(--tenant-bg,#fff)]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {year} {tenantName}. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Powered by{" "}
            <Link href="/" className="underline hover:text-gray-600">
              Multisite
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
