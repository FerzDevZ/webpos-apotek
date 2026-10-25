import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { bucketExpiry, stokLayakJual } from "@/lib/fefo";
import {
  AlertIcon,
  CalendarClockIcon,
  ReceiptIcon,
  PackageIcon,
  ArrowUpRightIcon,
} from "@/components/icons";

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Ringkasan />
    </Suspense>
  );
}

function sapaanSekarang(d = new Date()): string {
  const h = d.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

async function Ringkasan() {
  // Tandai request-time SEBELUM new Date()/query DB — shell PPR tidak boleh
  // menghitung nilai yang berubah antar-request.
  await connection();
  const user = await getCurrentUser();
  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);

  const [jumlahItem, salesHariIni, batchAktif, itemBersistokMin] = await Promise.all([
    db.item.count({ where: { aktif: true } }),
    db.sale.findMany({
      where: { tanggal: { gte: awalHari }, status: "PAID" },
      select: { total: true },
    }),
    db.batch.findMany({
      where: { qtySisa: { gt: 0 } },
      select: { id: true, noBatch: true, expiry: true, qtySisa: true, hargaBeli: true },
    }),
    db.item.findMany({
      where: { aktif: true, stokMinDasar: { gt: 0 } },
      select: {
        id: true,
        nama: true,
        satuanDasar: true,
        stokMinDasar: true,
        batches: { select: { id: true, noBatch: true, expiry: true, qtySisa: true, hargaBeli: true } },
      },
    }),
  ]);

  const omzetHariIni = salesHariIni.reduce((a, s) => a + s.total, 0);
  const bucket = bucketExpiry(batchAktif);
  const stokMenipis = itemBersistokMin
    .map((item) => ({
      id: item.id,
      nama: item.nama,
      satuan: item.satuanDasar,
      min: item.stokMinDasar,
      sisa: stokLayakJual(item.batches),
    }))
    .filter((x) => x.sisa < x.min);

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-4">
      {/* Strip utama: sapaan kiri, angka omzet sebagai jangkar kanan. */}
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{tanggal}</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">
            {sapaanSekarang()}, {user.nama.split(" ")[0]}
          </h1>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Omzet hari ini</p>
          <p className="font-display mt-0.5 text-3xl font-bold tabular-nums tracking-tight">
            {formatRupiah(omzetHariIni)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {salesHariIni.length} struk · {jumlahItem} item aktif
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Kolom lebar: hal-hal yang perlu dibaca satu per satu. */}
        <div className="space-y-4 lg:col-span-7">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <AlertIcon width={15} height={15} className={stokMenipis.length > 0 ? "text-warn" : "text-muted"} />
                Stok di bawah minimum
              </h2>
              {stokMenipis.length > 0 && <span className="chip">{stokMenipis.length} item</span>}
            </div>
            {stokMenipis.length === 0 ? (
              <p className="py-3 text-sm text-muted">
                Semua item masih di atas stok minimum. Daftar pesanan ke PBF bisa dilihat di modul
                Stok &amp; Kadaluarsa.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {stokMenipis.slice(0, 8).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{x.nama}</span>
                    <span className="shrink-0 tabular-nums text-ink-2">
                      sisa <strong className="text-warn">{x.sisa}</strong> / min {x.min} {x.satuan}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <CalendarClockIcon width={15} height={15} className="text-muted" />
              Batch mendekati kadaluarsa
            </h2>
            <div className="space-y-3.5">
              <Meter label="≤ 30 hari" qty={bucket[30]} warna="bg-danger" />
              <Meter label="31–60 hari" qty={bucket[60]} warna="bg-warn" />
              <Meter label="61–90 hari" qty={bucket[90]} warna="bg-warn/50" />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Satuan dasar (tablet/pcs/ml). Batch yang sudah lewat tanggal tidak ikut dihitung —
              dia sudah tidak boleh dijual dan harus masuk alur pembuangan.
            </p>
          </section>
        </div>

        {/* Kolom sempit: pintasan kerja harian. */}
        <div className="lg:col-span-5">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Aksi cepat</h2>
            <ul className="-mx-2">
              <Aksi
                href="/kasir"
                ikon={ReceiptIcon}
                judul="Buka kasir"
                isi="Scan barcode, FEFO otomatis, cetak struk"
                aktif={true}
              />
              <Aksi
                href="/pembelian/baru"
                ikon={PackageIcon}
                judul="Terima faktur PBF"
                isi="Catat pembelian, buat batch baru"
                aktif={true}
              />
              <Aksi
                href="/stok?bucket=30"
                ikon={CalendarClockIcon}
                judul="Cek kadaluarsa"
                isi="Batch yang perlu segera diprioritaskan"
                aktif={true}
              />
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, qty, warna }: { label: string; qty: number; warna: string }) {
  const max = Math.max(qty, 1);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-ink-2">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
        {/* lebar dinamis via style — kelas statis tidak bisa */}
        <div
          className={`h-full rounded-full ${warna}`}
          style={{ width: `${Math.min(100, (qty / max) * 100)}%` }}
        />
      </div>
      <span className={`w-12 shrink-0 text-right tabular-nums ${qty > 0 ? "font-semibold" : "text-muted"}`}>
        {qty}
      </span>
    </div>
  );
}

function Aksi({
  href,
  ikon: Ikon,
  judul,
  isi,
  aktif,
}: {
  href: string;
  ikon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
  judul: string;
  isi: string;
  aktif: boolean;
}) {
  if (!aktif) {
    return (
      <li>
        <span
          aria-disabled
          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2.5 opacity-60"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-inset text-muted">
            <Ikon width={15} height={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {judul}
              <span className="chip">segera</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted">{isi}</span>
          </span>
        </span>
      </li>
    );
  }
  return (
    <li>
      <a
        href={href}
        className="group flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand hover:bg-inset"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
          <Ikon width={15} height={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{judul}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{isi}</span>
        </span>
        <ArrowUpRightIcon
          width={14}
          height={14}
          className="text-muted transition-colors duration-150 group-hover:text-ink"
        />
      </a>
    </li>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="card h-[104px] animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="card h-44 animate-pulse" />
          <div className="card h-40 animate-pulse" />
        </div>
        <div className="card h-64 animate-pulse lg:col-span-5" />
      </div>
    </div>
  );
}
