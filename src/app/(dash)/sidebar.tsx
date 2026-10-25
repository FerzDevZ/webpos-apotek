"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/nav";
import type { Role } from "@/lib/constants";
import {
  HomeIcon,
  ReceiptIcon,
  ClipboardListIcon,
  PillIcon,
  PackageIcon,
  CalendarClockIcon,
  TruckIcon,
  UsersIcon,
  ChartIcon,
  ShieldCheckIcon,
  StoreIcon,
  LogoMark,
} from "@/components/icons";
import type { SVGProps } from "react";

const IKON: Record<string, (p: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  "/": HomeIcon,
  "/kasir": ReceiptIcon,
  "/resep": ClipboardListIcon,
  "/obat": PillIcon,
  "/pembelian": PackageIcon,
  "/stok": CalendarClockIcon,
  "/supplier": TruckIcon,
  "/pelanggan": UsersIcon,
  "/laporan": ChartIcon,
  "/pengguna": ShieldCheckIcon,
  "/pengaturan/outlet": StoreIcon,
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-card lg:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
        <LogoMark className="h-8 w-8" />
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold tracking-tight">WebPOS</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Apotek
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((it) => !it.roles || it.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={section.judul} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {section.judul}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Ikon = IKON[item.href] ?? PillIcon;
                  const aktif = item.aktif && pathname === item.href;

                  if (!item.aktif) {
                    return (
                      <li key={item.href}>
                        <span
                          aria-disabled
                          className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted"
                        >
                          <Ikon width={15} height={15} className="opacity-50" />
                          {item.label}
                          <span className="chip ml-auto">segera</span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={aktif ? "page" : undefined}
                        className={`rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand flex items-center gap-2.5 px-2 py-1.5 text-sm transition-colors duration-150 ${
                          aktif
                            ? "bg-brand-soft font-semibold text-brand-ink"
                            : "text-ink-2 hover:bg-inset hover:text-ink"
                        }`}
                      >
                        <Ikon width={15} height={15} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/** Navigasi ringkas untuk layar kecil — sidebar penuh disembunyikan di bawah lg. */
export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_SECTIONS.flatMap((s) => s.items).filter(
    (it) => it.aktif && (!it.roles || it.roles.includes(role)),
  );

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex gap-2 overflow-x-auto border-b border-line bg-card px-4 py-2 lg:hidden"
    >
      {items.map((item) => {
        const aktif = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={aktif ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              aktif
                ? "border-brand bg-brand-soft text-brand-ink"
                : "border-line text-ink-2"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
