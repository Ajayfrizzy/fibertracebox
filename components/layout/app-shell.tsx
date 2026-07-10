"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Boxes, FileText, Gauge, Microscope, Presentation, Route, TerminalSquare } from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/dashboard/traces", label: "Traces", icon: Route },
  { href: "/dashboard/replay", label: "Replay Lab", icon: Microscope },
  { href: "/dashboard/sandbox", label: "Sandbox", icon: Boxes },
  { href: "/dashboard/judge-demo", label: "Judge Demo", icon: Presentation },
  { href: "/dashboard/docs", label: "Docs/API", icon: FileText }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-panel/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-panel">
              <Activity size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-wide text-ink">FiberTracebox</span>
              <span className="mono block truncate text-[11px] uppercase text-gray-500">Failure replay infrastructure</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-white text-ink shadow-sm" : "text-gray-700 hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/dashboard/docs"
            aria-current={isActivePath(pathname, "/dashboard/docs") ? "page" : undefined}
            className={`hidden items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm sm:flex ${
              isActivePath(pathname, "/dashboard/docs")
                ? "border-ckb bg-ckb text-white"
                : "border-line bg-white text-ink hover:border-ckb"
            }`}
          >
            <TerminalSquare size={16} />
            CLI
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 xl:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white text-ink shadow-sm" : "text-gray-700 hover:bg-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
