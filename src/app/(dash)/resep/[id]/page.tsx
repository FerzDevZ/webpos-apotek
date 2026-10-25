import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { bolehDiulang } from "@/lib/signa";
import { ProsesResepButton } from "./proses-button";

export default function ResepDetailPage(props: PageProps<"/resep/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
      <Detail idPromise={props.params} />
    </Suspense>
  );
}

async function Detail({ idPromise }: { idPromise: Promise<{ id: string }> }) {
  await connection();
  const { id } = await idPromise;

  const user = await getCurrentUser();
  const resep = await db.resep.findUnique({
    where: { id },
    include: { items: true, sale: { select: { id: true } }, customer: { select: { nama: true } } },
  });
  if (!resep) notFound();

  const sudahDilayani = await db.sale.count({ where: { resepId: resep.id } });
  const masihBoleh = bolehDiulang(resep.iter, sudahDilayani);
  const bolehProses = (user.role === ROLE.ADMIN || user.role === ROLE.APOTEKER) && !resep.sale && masihBoleh;
  const subtotalRacikan = resep.items.filter((i) => i.isRacikan).reduce((a, i) => a + i.subtotal, 0);
  const subtotalNon = resep.items.filter((i) => !i.isRacikan).reduce((a, i) => a + i.subtotal, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/resep" className="text-xs font-medium text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
            ← Semua resep
          </Link>
          <h1 className="font-display mt-1 font-mono text-xl font-bold tracking-tight">{resep.noResep}</h1>
          <p className="mt-1 text-sm text-muted">
            {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(resep.tanggal)}
          </p>
        </div>
        <div className="card px-4 py-3 text-right text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Iter</p>
          <p className="font-display text-xl font-bold tabular-nums">{sudahDilayani}/{resep.iter}</p>
          <p className="text-[11px] text-muted">pelayanan</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-sm font-semibold">Pasien</h2>
            <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Nama</dt><dd className="font-medium">{resep.pasienNama}{resep.umur != null ? `, ${resep.umur} th` : ""}</dd></div>
              <div><dt className="text-xs text-muted">Dokter</dt><dd className="font-medium">{resep.dokter}{resep.noSIP ? ` — ${resep.noSIP}` : ""}</dd></div>
              {resep.customer && <div><dt className="text-xs text-muted">Pelanggan</dt><dd>{resep.customer.nama}</dd></div>}
              {resep.pasienTelp && <div><dt className="text-xs text-muted">Telepon</dt><dd className="tabular-nums">{resep.pasienTelp}</dd></div>}
              {resep.catatan && <div className="sm:col-span-2"><dt className="text-xs text-muted">Catatan</dt><dd>{resep.catatan}</dd></div>}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">{resep.tipe === "RACIKAN" ? "Racikan" : "Obat"}</h2>
            <ul className="mt-3 divide-y divide-line">
              {resep.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{it.namaBahan}{it.isRacikan && <span className="chip ml-1.5">racikan</span>}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {it.isRacikan
                        ? `${(it.qtyMilli / 1000).toLocaleString("id-ID")} per bungkus × ${it.jumlahDosis ?? 1} dosis`
                        : `${(it.qtyMilli / 1000).toLocaleString("id-ID")} ${it.satuan}`}
                      {it.aturanPakai ? ` · ${it.aturanPakai}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums text-ink-2">{it.subtotal > 0 ? formatRupiah(it.subtotal) : "—"}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-ink-2"><span>Obat non-racikan</span><span className="tabular-nums">{formatRupiah(subtotalNon)}</span></div>
              <div className="flex justify-between text-ink-2"><span>Racikan</span><span className="tabular-nums">{formatRupiah(subtotalRacikan)}</span></div>
              <div className="flex justify-between font-semibold"><span>Estimasi total</span><span className="tabular-nums">{formatRupiah(subtotalNon + subtotalRacikan)}</span></div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-sm font-semibold">Pelayanan</h2>
            {resep.sale ? (
              <div className="mt-3">
                <p className="text-sm text-muted">Resep ini sudah diproses menjadi penjualan.</p>
                <Link href={`/struk/${resep.sale.id}`} className="btn btn-outline mt-3 w-full">Lihat struk</Link>
              </div>
            ) : masihBoleh ? (
              <div className="mt-3">
                <p className="text-sm leading-relaxed text-muted">
                  Stok dialokasi FEFO saat diproses. Pastikan obat sudah diperiksa ulang (golongan{" "}
                  <strong>keras/psikotropika</strong> dicatat di buku khusus).
                </p>
                {bolehProses ? (
                  <div className="mt-4"><ProsesResepButton resepId={resep.id} /></div>
                ) : (
                  <p className="mt-3 text-sm text-warn">Role Anda tidak berwenang memproses.</p>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2.5 text-sm text-warn">
                Iter resep habis ({sudahDilayani} dari {resep.iter} pelayanan). Perpanjangan butuh resep baru dari dokter.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
