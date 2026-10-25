import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/constants";
import { formatRupiah } from "@/lib/money";
import { formatStok, type Satuan } from "@/lib/units";
import { GOLONGAN_LABEL } from "@/lib/constants";
import { GolonganBadge } from "./golongan-badge";
import { ToggleAktif } from "./toggle-aktif";
import { PlusIcon } from "@/components/icons";

export default function DaftarObatPage(props: PageProps<"/obat">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Master Obat</h1>
        <p className="mt-1 text-sm text-muted">Daftar semua item yang dikenal sistem — obat, alkes, dan herbal.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <DaftarObat searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

const PER_HALAMAN = 25;

async function DaftarObat({ searchParams }: { searchParams: PageProps<"/obat">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").toString().trim().toLowerCase();
  const golonganFilter = (sp.golongan ?? "").toString();
  const kategoriFilter = (sp.kategori ?? "").toString();
  const halaman = Math.max(1, Number(sp.page ?? 1) || 1);

  const user = await getCurrentUser();
  const bolehKelola = user.role === ROLE.ADMIN || user.role === ROLE.APOTEKER;

  // Jumlah item apotek ~ribuan; filter di JS supaya pencarian case-insensitive
  // (SQLite Prisma tidak punya mode insensitive).
  const [semuaItem, stokPerItem] = await Promise.all([
    db.item.findMany({ include: { units: true }, orderBy: { nama: "asc" } }),
    db.batch.groupBy({ by: ["itemId"], _sum: { qtySisa: true } }),
  ]);

  const kategoriUnik = [...new Set(semuaItem.map((i) => i.kategori).filter((k): k is string => !!k))].sort();

  const stokMap = new Map(stokPerItem.map((s) => [s.itemId, s._sum.qtySisa ?? 0]));

  const hasil = semuaItem.filter((i) => {
    if (golonganFilter && i.golongan !== golonganFilter) return false;
    if (kategoriFilter && i.kategori !== kategoriFilter) return false;
    if (q) {
      const di = `${i.nama} ${i.kode} ${i.barcode ?? ""} ${i.pabrik ?? ""}`.toLowerCase();
      if (!di.includes(q)) return false;
    }
    return true;
  });

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const hal = Math.min(halaman, totalHalaman);
  const tampil = hasil.slice((hal - 1) * PER_HALAMAN, hal * PER_HALAMAN);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama, kode, barcode…"
            aria-label="Cari item"
            className="input w-56 py-1.5"
          />
          <select name="golongan" defaultValue={golonganFilter} aria-label="Filter golongan" className="input w-auto py-1.5">
            <option value="">Semua golongan</option>
            {Object.entries(GOLONGAN_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <select name="kategori" defaultValue={kategoriFilter} aria-label="Filter kategori" className="input w-auto py-1.5">
            <option value="">Semua kategori</option>
            {kategoriUnik.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-outline px-3 py-1.5 text-xs">
            Cari
          </button>
        </form>

        {bolehKelola && (
          <Link href="/obat/baru" className="btn btn-primary px-3 py-1.5 text-xs">
            <PlusIcon width={14} height={14} />
            Tambah obat
          </Link>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Golongan</th>
              <th className="px-4 py-3 font-medium">Stok</th>
              <th className="px-4 py-3 text-right font-medium">Harga jual</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {bolehKelola && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 && (
              <tr>
                <td colSpan={bolehKelola ? 6 : 5} className="px-4 py-10 text-center text-muted">
                  {semuaItem.length === 0 ? (
                    <>Belum ada item terdaftar. {bolehKelola ? <>Mulai dari <Link href="/obat/baru" className="font-medium text-brand-ink underline underline-offset-2">tambah obat pertama</Link>.</> : "Hubungi admin/apoteker untuk menambahkan."}</>
                  ) : (
                    "Tidak ada item yang cocok dengan pencarian atau filter."
                  )}
                </td>
              </tr>
            )}
            {tampil.map((i) => {
              const satuan = i.units as Satuan[];
              const def = i.units.find((u) => u.isDefault) ?? i.units.find((u) => u.faktor === 1);
              const stok = stokMap.get(i.id) ?? 0;
              const menipis = stok < i.stokMinDasar;
              return (
                <tr key={i.id} className="border-b border-line last:border-0 hover:bg-inset/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/obat/${i.id}`}
                      className="rounded font-medium outline-none transition-colors duration-150 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {i.nama}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {i.kode}
                      {i.barcode ? ` · ${i.barcode}` : ""}
                      {i.kategori ? ` · ${i.kategori}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <GolonganBadge golongan={i.golongan} />
                    {i.requiresResep && <p className="mt-1 text-[10px] font-medium text-warn">wajib resep</p>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {stok > 0 ? (
                      <>
                        <span className={menipis ? "font-semibold text-warn" : ""}>{formatStok(stok, satuan)}</span>
                        {menipis && <p className="text-[10px] text-warn">di bawah minimum</p>}
                      </>
                    ) : (
                      <span className="text-muted">tidak ada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {def ? (
                      <>
                        {formatRupiah(def.hargaJual)}
                        <p className="text-[10px] text-muted">per {def.nama}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {i.aktif ? (
                      <span className="inline-flex rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">aktif</span>
                    ) : (
                      <span className="chip">nonaktif</span>
                    )}
                  </td>
                  {bolehKelola && (
                    <td className="px-2 py-3 text-right">
                      <ToggleAktif itemId={i.id} aktif={i.aktif} nama={i.nama} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalHalaman > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            {hasil.length} item · halaman {hal} dari {totalHalaman}
          </p>
          <div className="flex gap-2">
            {hal > 1 && (
              <Link href={urlQuery(sp, hal - 1)} className="btn btn-outline px-3 py-1.5 text-xs">
                Sebelumnya
              </Link>
            )}
            {hal < totalHalaman && (
              <Link href={urlQuery(sp, hal + 1)} className="btn btn-outline px-3 py-1.5 text-xs">
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function urlQuery(sp: Record<string, string | string[] | undefined>, halaman: number): string {
  const p = new URLSearchParams();
  for (const k of ["q", "golongan", "kategori"]) {
    const v = sp[k];
    if (v) p.set(k, String(v));
  }
  if (halaman > 1) p.set("page", String(halaman));
  const s = p.toString();
  return s ? `/obat?${s}` : "/obat";
}
