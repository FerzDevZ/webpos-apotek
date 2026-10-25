import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { PlusIcon } from "@/components/icons";

export default function PembelianPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Pembelian (PBF)</h1>
          <p className="mt-1 text-sm text-muted">Faktur penerimaan barang — sumber semua stok masuk dan batch baru.</p>
        </div>
        <Link href="/pembelian/baru" className="btn btn-primary px-3 py-1.5 text-xs">
          <PlusIcon width={14} height={14} />
          Terima faktur baru
        </Link>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <Daftar />
      </Suspense>
    </div>
  );
}

async function Daftar() {
  await connection();
  const purchases = await db.purchase.findMany({
    orderBy: { tanggal: "desc" },
    take: 50,
    include: { supplier: { select: { nama: true } }, _count: { select: { items: true } } },
  });

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">No. faktur</th>
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium">Supplier</th>
            <th className="px-4 py-3 text-right font-medium">Item</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {purchases.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted">
                Belum ada faktur. Barang masuk pertama dicatat lewat{" "}
                <Link href="/pembelian/baru" className="font-medium text-brand-ink underline underline-offset-2">terima faktur</Link>.
              </td>
            </tr>
          )}
          {purchases.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0 hover:bg-inset/40">
              <td className="px-4 py-3">
                <Link href={`/pembelian/${p.id}`} className="rounded font-mono text-[13px] font-medium outline-none hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand">
                  {p.noFaktur}
                </Link>
              </td>
              <td className="px-4 py-3">
                {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(p.tanggal)}
              </td>
              <td className="px-4 py-3 text-ink-2">{p.supplier?.nama ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{p._count.items} baris</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">{formatRupiah(p.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
