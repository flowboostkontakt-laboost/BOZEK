import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { ComponentType, SVGProps } from "react";
import {
  IconDashboard,
  IconUsers,
  IconPackage,
  IconChart,
  IconSettings,
  IconActivity,
  IconCheck,
  IconCalendar,
  IconMenu,
} from "../../components/icons";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const NAV: { to: string; label: string; icon: IconType; end?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/admin/pracownice", label: "Pracownice", icon: IconUsers },
  { to: "/admin/katalog", label: "Katalog Produktów", icon: IconPackage },
  { to: "/admin/weryfikacja", label: "Do sprawdzenia", icon: IconCheck },
  { to: "/admin/kalendarz", label: "Kalendarz", icon: IconCalendar },
  { to: "/admin/raporty", label: "Raporty", icon: IconChart },
  { to: "/admin/ustawienia", label: "Ustawienia", icon: IconSettings },
  { to: "/admin/api-status", label: "API Status", icon: IconActivity },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-bg text-ink">
      {/* Nakładka na telefonie */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar — wysuwany na telefonie, stały na desktopie */}
      <aside
        className={`fixed z-40 flex h-full w-64 shrink-0 transform flex-col border-r border-line bg-surface-1 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-bold text-white">M</div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Micro-Workshop</p>
            <p className="text-[11px] text-ink-faint">Production App</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-accent-soft text-ink shadow-[inset_0_0_0_1px_rgba(168,38,74,0.35)]"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                ].join(" ")
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-xs font-semibold">A</div>
          <div className="leading-tight">
            <p className="text-sm font-medium">Administrator</p>
            <p className="text-[11px] text-ink-faint">Katarzyna Bożek</p>
          </div>
        </div>
      </aside>

      {/* Główna kolumna */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Pasek mobilny z hamburgerem */}
        <div
          className="flex items-center gap-3 border-b border-line bg-surface-1 px-4 py-3 lg:hidden"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
        >
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface-2" aria-label="Menu">
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Panel administratora</span>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
