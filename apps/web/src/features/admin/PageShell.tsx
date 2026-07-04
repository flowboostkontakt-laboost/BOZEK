import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
          {subtitle && <p className="text-sm text-ink-faint">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="hidden h-9 w-9 place-items-center rounded-full bg-surface-3 text-xs font-semibold sm:grid">A</div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </>
  );
}
