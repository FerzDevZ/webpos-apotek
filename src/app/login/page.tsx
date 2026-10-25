import type { Metadata } from "next";
import { LogoMark, CalendarClockIcon, ClipboardListIcon, ChartIcon, CheckIcon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk — WebPOS Apotek",
};

const POIN = [
  {
    ikon: CalendarClockIcon,
    judul: "Stok per batch dengan FEFO",
    isi: "Batch yang paling dekat kadaluarsa selalu keluar lebih dulu.",
  },
  {
    ikon: ClipboardListIcon,
    judul: "Resep racikan & non-racikan",
    isi: "Signa, iter, dan bahan racikan tercatat rapi per resep.",
  },
  {
    ikon: ChartIcon,
    judul: "Margin dari batch sebenarnya",
    isi: "HPP dihitung dari batch yang benar-benar keluar, bukan rata-rata.",
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Panel kiri: identitas produk. Gelap netral (bukan area aksen) —
          hijau hanya untuk logo & ikon poin. */}
      <aside className="relative hidden flex-col justify-between bg-panel p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <LogoMark className="h-9 w-9" />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold tracking-tight text-panel-ink">WebPOS</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-panel-muted">
              Apotek
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.1rem)] font-bold leading-snug tracking-tight text-panel-ink">
            Kasir, stok, dan resep apotek dalam satu aplikasi.
          </h2>
          <ul className="mt-8 space-y-5">
            {POIN.map((p) => (
              <li key={p.judul} className="flex gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-panel-accent">
                  <p.ikon width={15} height={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-panel-ink">{p.judul}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-panel-muted">{p.isi}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-xs text-panel-muted">
          <CheckIcon width={13} height={13} className="text-panel-accent" />
          Data tersimpan lokal di komputer apotek — tanpa internet, tetap jalan.
        </p>
      </aside>

      {/* Panel kanan: form, rata kiri — bukan kolom terpusat. */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-9 w-9" />
            <p className="font-display text-lg font-bold tracking-tight">WebPOS Apotek</p>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">Masuk</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Gunakan akun yang dibuat oleh admin apotek Anda.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Lupa password? Hubungi admin apotek — password hanya bisa diatur ulang dari halaman
            Pengguna.
          </p>
        </div>
      </div>
    </div>
  );
}
