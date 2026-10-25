import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah, formatAngka } from "@/lib/money";

export default function LaporanPage(props: PageProps<"/laporan">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="mt-1 text-sm text-muted">Rekap penjualan &amp; laba. Laba dihitung dari HPP batch yang benar-benar keluar.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <Isi sp={props.searchParams} />
      </Suspense>
    </div>
  );
}

const fmtJam = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function Isi({ sp }: { sp: PageProps<"/laporan">["searchParams"] }) {
  await connection();
  const s = await sp;
  const isoHariIni = (d: Date) => d.toISOString().slice(0, 10);
  const dariStr = (s.from ?? isoHariIni(new Date())).toString();
  const keStr = (s.to ?? isoHariIni(new Date())).toString();
  const dari = new Date(`${dariStr}T00:00:00`);
  const ke = new Date(`${keStr}T23:59:59.999`);
  const valid = !Number.isNaN(dari.getTime()) && !Number.isNaN(ke.getTime()) && dari <= ke;

  if (!valid) {
    return <p className="card p-6 text-sm text-danger">Rentang tanggal tidak valid.</p>;
  }

  const sales = await db.sale.findMany({
    where: { tanggal: { gte: dari, lte: ke } },
    orderBy: { tanggal: "desc" },
    include: {
      kasir: { select: { nama: true } },
      items: { include: { batch: { select: { hargaBeli: true } }, item: { select: { id: true, nama: true } } } },
    },
  });

  const paid = sales.filter((x) => x.status === "PAID");
  const voided = sales.filter((x) => x.status === "VOID");

  const omzet = paid.reduce((a, x) => a + x.total, 0);
  const hpp = paid.reduce(
    (a, x) => a + x.items.reduce((b, it) => b + it.qtyDasar * (it.batch?.hargaBeli ?? 0), 0),
    0,
  );
  const laba = omzet - hpp;

  const perMetode = new Map<string, number>();
  for (const x of paid) perMetode.set(x.metodeBayar, (perMetode.get(x.metodeBayar) ?? 0) + x.total);

  // Top item by qty dasar
  const perItem = new Map<string, { nama: string; qty: number; omzet: number }>();
  for (const x of paid) {
    for (const it of x.items) {
      const cur = perItem.get(it.itemId) ?? { nama: it.item.nama, qty: 0, omzet: 0 };
      cur.qty += it.qtyDasar;
      cur.omzet += it.subtotal;
      perItem.set(it.itemId, cur);
    }
  }
  const top = [...perItem.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);

  const csvUrl = `/laporan/penjualan.csv?from=${dariStr}&to=${keStr}`;

  return (
    <div className="space-y-4">
      <form method="GET" className="card flex flex-wrap items-end gap-2 p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Dari</span>
          <input type="date" name="from" defaultValue={dariStr} className="input py-1.5" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Sampai</span>
          <input type="date" name="to" defaultValue={keStr} className="input py-1.5" />
        </label>
        <button type="submit" className="btn btn-outline px-3 py-1.5 text-xs">Terapkan</button>
        <a href={csvUrl} className="btn btn-outline px-3 py-1.5 text-xs" download>
          Unduh CSV
        </a>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kartu label="Omzet (lunas)" nilai={formatRupiah(omzet)} sub={`${paid.length} struk`} />
        <Kartu label="HPP" nilai={formatRupiah(hpp)} sub="harga beli batch keluar" />
        <Kartu label="Laba kotor" nilai={formatRupiah(laba)} sub={omzet > 0 ? `${((laba / omzet) * 100).toFixed(1)}% margin` : "—"} />
        <Kartu label="Dibatalkan" nilai={String(voided.length)} sub={voided.length > 0 ? formatRupiah(voided.reduce((a, x) => a + x.total, 0)) : "bersih"} warn={voided.length > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card p-5 lg:col-span-5">
          <h2 className="mb-3 text-sm font-semibold">Per metode bayar</h2>
          {perMetode.size === 0 ? (
            <p className="text-sm text-muted">Belum ada transaksi lunas pada periode ini.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {[...perMetode.entries()].sort((a, b) => b[1] - a[1]).map(([m, v]) => (
                <li key={m} className="flex items-center justify-between">
                  <span className="text-ink-2">{m}</span>
                  <span className="tabular-nums font-medium">{formatRupiah(v)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 mb-3 text-sm font-semibold">Item terlaris (satuan dasar)</h2>
          {top.length === 0 ? (
            <p className="text-sm text-muted">Belum ada penjualan.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {top.map(([id, v], i) => (
                <li key={id} className="flex items-center gap-2.5">
                  <span className="w-4 text-xs font-semibold text-muted">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{v.nama}</span>
                  <span className="tabular-nums text-ink-2">{formatAngka(v.qty)}</span>
                  <span className="w-24 text-right tabular-nums font-medium">{formatRupiah(v.omzet)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="lg:col-span-7">
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Struk</th>
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">Kasir</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Tidak ada struk pada periode ini.</td></tr>
                )}
                {sales.map((x) => (
                  <tr key={x.id} className="border-b border-line last:border-0 hover:bg-inset/40">
                    <td className="px-4 py-3">
                      <Link href={`/struk/${x.id}`} className="rounded font-mono text-[13px] font-medium outline-none hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand">
                        {x.noStruk}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-2">{fmtJam.format(x.tanggal)}</td>
                    <td className="px-4 py-3 text-ink-2">{x.kasir?.nama ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatRupiah(x.total)}</td>
                    <td className="px-4 py-3">
                      {x.status === "PAID" ? (
                        <span className="chip">{x.metodeBayar.toLowerCase()}</span>
                      ) : (
                        <span className="inline-flex rounded-md bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">void</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Kartu({ label, nilai, sub, warn = false }: { label: string; nilai: string; sub: string; warn?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-display mt-1 text-xl font-bold tabular-nums ${warn ? "text-danger" : ""}`}>{nilai}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}
