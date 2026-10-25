import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { PlusIcon } from "@/components/icons";

export default function ResepListPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Resep</h1>
          <p className="mt-1 text-sm text-muted">Pintu legal penjualan obat keras, psikotropika, dan narkotika.</p>
        </div>
        <Link href="/resep/baru" className="btn btn-primary px-3 py-1.5 text-xs">
          <PlusIcon width={14} height={14} />
          Input resep baru
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
  const reseps = await db.resep.findMany({
    orderBy: { tanggal: "desc" },
    take: 50,
    include: {
      items: { select: { namaBahan: true, isRacikan: true } },
      sale: { select: { id: true } },
    },
  });

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">No. resep</th>
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium">Pasien</th>
            <th className="px-4 py-3 font-medium">Dokter</th>
            <th className="px-4 py-3 font-medium">Isi</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {reseps.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-muted">
                Belum ada resep. Mulai dari{" "}
                <Link href="/resep/baru" className="font-medium text-brand-ink underline underline-offset-2">input resep baru</Link>.
              </td>
            </tr>
          )}
          {reseps.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0 hover:bg-inset/40">
              <td className="px-4 py-3">
                <Link href={`/resep/${r.id}`} className="rounded font-mono text-[13px] font-medium outline-none hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand">
                  {r.noResep}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(r.tanggal)}
              </td>
              <td className="px-4 py-3">
                {r.pasienNama}
                {r.umur != null && <span className="text-xs text-muted"> · {r.umur} th</span>}
              </td>
              <td className="px-4 py-3 text-ink-2">{r.dokter}</td>
              <td className="px-4 py-3 text-xs text-muted">{r.items.length} baris{r.items.some((i) => i.isRacikan) ? " · racikan" : ""}</td>
              <td className="px-4 py-3">
                {r.sale ? (
                  <Link href={`/struk/${r.sale.id}`} className="chip cursor-pointer font-semibold hover:text-brand-ink">terjual</Link>
                ) : (
                  <span className="inline-flex rounded-md bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn">menunggu</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
