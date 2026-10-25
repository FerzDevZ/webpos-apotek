import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/constants";
import { formatRupiah } from "@/lib/money";
import { formatStok, cekHargaBerjenjang, type Satuan } from "@/lib/units";
import { daysUntil } from "@/lib/fefo";
import { GolonganBadge } from "../golongan-badge";
import { ItemForm } from "../item-form";
import { AlertIcon } from "@/components/icons";

export default async function EditObatPage(props: PageProps<"/obat/[id]">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <EditObat params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function EditObat({
  params,
  searchParams,
}: {
  params: PageProps<"/obat/[id]">["params"];
  searchParams: PageProps<"/obat/[id]">["searchParams"];
}) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const user = await getCurrentUser();
  if (user.role !== ROLE.ADMIN && user.role !== ROLE.APOTEKER) redirect("/obat");

  const item = await db.item.findUnique({
    where: { id },
    include: { units: { orderBy: { faktor: "desc" } }, batches: { orderBy: { expiry: "asc" } } },
  });
  if (!item) notFound();

  const satuan: Satuan[] = item.units;
  const defUnit = item.units.find((u) => u.isDefault);
  const totalStok = item.batches.reduce((a, b) => a + Math.max(0, b.qtySisa), 0);
  const peringatanHarga = cekHargaBerjenjang(satuan);
  const barisTersimpan = sp.tersimpan === "1";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/obat" className="text-xs font-medium text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
            ← Kembali ke daftar obat
          </Link>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">{item.nama}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono text-xs">{item.kode}</span>
            <GolonganBadge golongan={item.golongan} />
            {defUnit && <span>default jual per {defUnit.nama}</span>}
          </p>
        </div>
        <div className="card px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Stok tercatat</p>
          <p className={`font-display text-xl font-bold tabular-nums ${totalStok < item.stokMinDasar ? "text-warn" : ""}`}>
            {totalStok > 0 ? formatStok(totalStok, satuan) : "0"}
          </p>
          <p className="text-[11px] text-muted">min {item.stokMinDasar} {item.satuanDasar}</p>
        </div>
      </div>

      {barisTersimpan && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-ink">Perubahan tersimpan.</p>
      )}
      {peringatanHarga.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg bg-warn/10 px-3 py-2.5 text-sm text-warn">
          <AlertIcon width={15} height={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Harga antar satuan janggal:</p>
            <ul className="mt-1 list-inside list-disc text-xs leading-relaxed">
              {peringatanHarga.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ItemForm
        initial={{
          id: item.id,
          kode: item.kode,
          barcode: item.barcode ?? "",
          nama: item.nama,
          kategori: item.kategori ?? "",
          pabrik: item.pabrik ?? "",
          golongan: item.golongan as never,
          satuanDasar: item.satuanDasar,
          hargaJualDasar: item.hargaJualDasar,
          stokMinDasar: item.stokMinDasar,
          requiresResep: item.requiresResep,
          bahanRacikan: item.bahanRacikan,
          jualBebas: item.jualBebas,
          defaultNama: defUnit?.nama ?? "",
          units: item.units.filter((u) => u.faktor !== 1).map((u) => ({ nama: u.nama, faktor: u.faktor, hargaJual: u.hargaJual })),
        }}
      />

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Batch &amp; kadaluarsa</h2>
        <p className="mt-0.5 text-xs text-muted">Stok fisik tersimpan per batch. Batch masuk lewat modul Pembelian (segera).</p>
        {item.batches.length === 0 ? (
          <p className="mt-4 rounded-lg bg-inset px-3 py-3 text-sm text-muted">
            Belum ada batch untuk item ini. Stok akan muncul setelah faktur pembelian pertama dicatat.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4 font-medium">No. batch</th>
                  <th className="py-2 pr-4 font-medium">Kadaluarsa</th>
                  <th className="py-2 pr-4 text-right font-medium">Sisa</th>
                  <th className="py-2 text-right font-medium">Harga beli</th>
                </tr>
              </thead>
              <tbody>
                {item.batches.map((b) => {
                  const hari = daysUntil(b.expiry);
                  const warna = hari < 0 ? "text-danger" : hari <= 30 ? "text-warn" : "";
                  return (
                    <tr key={b.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-[13px]">{b.noBatch}</td>
                      <td className={`py-2.5 pr-4 ${warna}`}>
                        {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(b.expiry)}
                        {hari >= 0 && hari <= 90 && <span className="ml-1.5 text-[11px]">({hari} hari)</span>}
                        {hari < 0 && <span className="ml-1.5 text-[11px] font-medium">(kedaluwarsa)</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatStok(Math.max(0, b.qtySisa), satuan)}</td>
                      <td className="py-2.5 text-right tabular-nums text-ink-2">
                        {formatRupiah(b.hargaBeli)}<span className="text-[10px] text-muted"> /{item.satuanDasar}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
