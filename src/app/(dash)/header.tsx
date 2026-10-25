import { logout } from "@/app/actions/auth";
import { LogoMark, LogOutIcon } from "@/components/icons";
import type { Role } from "@/lib/constants";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  APOTEKER: "Apoteker",
  KASIR: "Kasir",
};

export function HeaderBar({ nama, role }: { nama: string; role: Role }) {
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-card px-4 lg:px-6">
        <div className="flex items-center gap-2.5 lg:hidden">
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-[15px] font-bold tracking-tight">WebPOS</span>
        </div>

        <p className="hidden text-xs text-muted md:block">{tanggal}</p>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{nama}</p>
            <span className="mt-0.5 inline-flex rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">
              {ROLE_LABEL[role]}
            </span>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn-outline px-2.5" aria-label="Keluar dari aplikasi">
              <LogOutIcon width={15} height={15} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </header>
    </>
  );
}
