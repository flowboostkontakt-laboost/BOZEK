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
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-ink-faint">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-3 text-xs font-semibold">A</div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </>
  );
}
