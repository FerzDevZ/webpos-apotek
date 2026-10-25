import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";

const TIPE_LABEL: Record<string, string> = {
  PURCHASE: "Pembelian",
  SALE: "Penjualan",
  RETURN_SUPPLIER: "Retur ke PBF",
  RETURN_CUSTOMER: "Retur pembeli",
  ADJUST: "Penyesuaian",
  DISPOSE: "Pembuangan",
  VOID_SALE: "Pembatalan struk",
};

export default function KartuStokPage(props: PageProps<"/stok/kartu/[itemId]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
      <Kartu idPromise={props.params} />
    </Suspense>
  );
}

async function Kartu({ idPromise }: { idPromise: Promise<{ itemId: string }> }) {
  await connection();
  const { itemId } = await idPromise;

  const item = await db.item.findUnique({ where: { id: itemId }, select: { nama: true, kode: true, satuanDasar: true } });
  if (!item) notFound();

  const stokSekarang = await db.batch.aggregate({ where: { itemId }, _sum: { qtySisa: true } });

  // Saldo berjalan dihitung dari SELURUH riwayat (murah: hanya kolom id+qty),
  // lalu 200 terbaru ditampilkan dengan detail.
  const [allQty, movements] = await Promise.all([
    db.stockMovement.findMany({ where: { itemId }, orderBy: { ts: "asc" }, select: { id: true, qty: true } }),
    db.stockMovement.findMany({
      where: { itemId },
      orderBy: { ts: "desc" },
      take: 200,
      include: { batch: { select: { noBatch: true } }, user: { select: { nama: true } } },
    }),
  ]);
  const saldoById = new Map<string, number>();
  let saldoBerjalan = 0;
  for (const m of allQty) {
    saldoBerjalan += m.qty;
    saldoById.set(m.id, saldoBerjalan);
  }
  const rows = movements.map((m) => ({ m, saldo: saldoById.get(m.id) ?? 0 }));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/stok" className="text-xs font-medium text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
          ← Stok &amp; Kadaluarsa
        </Link>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">Kartu stok — {item.nama}</h1>
        <p className="mt-1 text-sm text-muted">
          <span className="font-mono text-[13px]">{item.kode}</span> · stok sekarang{" "}
          <strong>{stokSekarang._sum.qtySisa ?? 0} {item.satuanDasar}</strong>
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Jenis</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 text-right font-medium">Masuk</th>
              <th className="px-4 py-3 text-right font-medium">Keluar</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Oleh / catatan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Belum ada pergerakan stok.</td></tr>
            )}
            {rows.map(({ m, saldo }) => {
              const masuk = m.qty > 0 ? m.qty : null;
              const keluar = m.qty < 0 ? -m.qty : null;
              return (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">
                    {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(m.ts)}
                  </td>
                  <td className="px-4 py-2.5">{TIPE_LABEL[m.tipe] ?? m.tipe}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted">{m.batch?.noBatch ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-brand-ink">{masuk ?? ""}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-danger">{keluar ?? ""}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{saldo}</td>
                  <td className="px-4 py-2.5 max-w-56 truncate text-xs text-muted" title={m.catatan ?? undefined}>
                    {m.user?.nama ? `${m.user.nama}${m.catatan ? " — " : ""}` : ""}
                    {m.catatan ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Riwayat dari ledger append-only (maks. 200 terbaru). Saldo akhir dihitung dari seluruh riwayat — jika beda dengan stok fisik, gunakan penyesuaian stok.
      </p>
    </div>
  );
}
