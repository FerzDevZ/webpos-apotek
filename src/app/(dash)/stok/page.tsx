import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { formatStok, type Satuan } from "@/lib/units";
import { daysUntil } from "@/lib/fefo";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";

export default function StokPage(props: PageProps<"/stok">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Stok &amp; Kadaluarsa</h1>
        <p className="mt-1 text-sm text-muted">Semua batch berdasarkan tanggal kadaluarsa terdekat. Batch mati (sisa 0) disembunyikan.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <DaftarBatch sp={props.searchParams} />
      </Suspense>
    </div>
  );
}

const BUCKET_LABEL: Record<string, string> = {
  expired: "Sudah kadaluarsa",
  "30": "≤ 30 hari",
  "60": "31–60 hari",
  "90": "61–90 hari",
};

async function DaftarBatch({ sp }: { sp: PageProps<"/stok">["searchParams"] }) {
  await connection();
  const s = await sp;
  const bucket = (s.bucket ?? "").toString();
  const user = await getCurrentUser();
  const bolehKelola = user.role === ROLE.ADMIN || user.role === ROLE.APOTEKER;

  const batches = await db.batch.findMany({
    where: { qtySisa: { gt: 0 } },
    orderBy: { expiry: "asc" },
    include: {
      item: { select: { id: true, nama: true, satuanDasar: true, units: true } },
      supplier: { select: { nama: true } },
    },
  });

  const tampil = batches.filter((b) => {
    const d = daysUntil(b.expiry);
    if (bucket === "expired") return d < 0;
    if (bucket === "30") return d >= 0 && d <= 30;
    if (bucket === "60") return d > 30 && d <= 60;
    if (bucket === "90") return d > 60 && d <= 90;
    return true;
  });

  const nilaiTotal = tampil.reduce((a, b) => a + b.qtySisa * b.hargaBeli, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href="/stok" className={`btn px-3 py-1.5 text-xs ${bucket === "" ? "btn-primary" : "btn-outline"}`}>Semua</a>
        {Object.entries(BUCKET_LABEL).map(([k, label]) => (
          <a key={k} href={`/stok?bucket=${k}`} className={`btn px-3 py-1.5 text-xs ${bucket === k ? "btn-primary" : "btn-outline"}`}>
            {label}
          </a>
        ))}
        <p className="ml-auto text-sm text-muted">
          {tampil.length} batch · nilai stok <strong className="text-ink">{formatRupiah(nilaiTotal)}</strong>
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Barang</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Kadaluarsa</th>
              <th className="px-4 py-3 text-right font-medium">Sisa</th>
              <th className="px-4 py-3 text-right font-medium">Nilai</th>
              {bolehKelola && <th className="px-4 py-3 text-right font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 && (
              <tr><td colSpan={bolehKelola ? 6 : 5} className="px-4 py-10 text-center text-muted">Tidak ada batch pada kelompok ini.</td></tr>
            )}
            {tampil.map((b) => {
              const hari = daysUntil(b.expiry);
              const satuan = b.item.units as Satuan[];
              const warna = hari < 0 ? "text-danger" : hari <= 30 ? "text-warn" : "";
              return (
                <tr key={b.id} className="border-b border-line last:border-0 hover:bg-inset/40">
                  <td className="px-4 py-3">
                    <Link href={`/stok/kartu/${b.item.id}`} className="rounded font-medium outline-none hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand">
                      {b.item.nama}
                    </Link>
                    {b.supplier && <p className="mt-0.5 text-xs text-muted">{b.supplier.nama}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px]">{b.noBatch}</td>
                  <td className={`px-4 py-3 ${warna}`}>
                    {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(b.expiry)}
                    <span className="ml-1.5 text-xs">{hari < 0 ? "kedaluwarsa" : `${hari} hari`}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatStok(b.qtySisa, satuan)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">{formatRupiah(b.qtySisa * b.hargaBeli)}</td>
                  {bolehKelola && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <a href={`/stok/sesuaikan/${b.id}`} className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
                          Sesuaikan
                        </a>
                        <a href={`/stok/buang/${b.id}`} className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand">
                          Buang
                        </a>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
