import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";

export default function DetailPembelianPage(props: PageProps<"/pembelian/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
      <Detail idPromise={props.params} />
    </Suspense>
  );
}

async function Detail({ idPromise }: { idPromise: Promise<{ id: string }> }) {
  await connection();
  const { id } = await idPromise;

  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { nama: true } },
      items: { include: { item: { select: { nama: true, satuanDasar: true } } } },
    },
  });
  if (!purchase) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/pembelian" className="text-xs font-medium text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
            ← Semua faktur
          </Link>
          <h1 className="font-display mt-1 font-mono text-xl font-bold tracking-tight">{purchase.noFaktur}</h1>
          <p className="mt-1 text-sm text-muted">
            {new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(purchase.tanggal)}
            {purchase.supplier ? ` · ${purchase.supplier.nama}` : ""}
            {purchase.catatan ? ` · ${purchase.catatan}` : ""}
          </p>
        </div>
        <div className="card px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Total faktur</p>
          <p className="font-display text-xl font-bold tabular-nums">{formatRupiah(purchase.total)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Barang</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Harga/dasar</th>
              <th className="px-4 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((it) => (
              <tr key={it.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">{it.item.nama}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[13px]">{it.noBatch}</span>
                  <p className="text-xs text-muted">
                    ED {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(it.expiry)}
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {it.qtyUnit} × {it.faktor} = {it.qtyDasar} {it.item.satuanDasar}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-2">{formatRupiah(it.hargaBeli)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatRupiah(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
