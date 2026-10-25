import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { PelangganForm } from "./form-client";

export default function PelangganPage(props: PageProps<"/pelanggan">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Pelanggan</h1>
        <p className="mt-1 text-sm text-muted">Daftar pelanggan &amp; member. Catatan alergi obat ditulis di kolom catatan.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <Isi sp={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Isi({ sp }: { sp: PageProps<"/pelanggan">["searchParams"] }) {
  await connection();
  const s = await sp;
  const q = (s.q ?? "").toString().trim().toLowerCase();
  const editId = (s.edit ?? "").toString();

  const semua = await db.customer.findMany({ orderBy: { nama: "asc" }, include: { _count: { select: { sales: true } } } });
  const pelanggan = q ? semua.filter((c) => `${c.nama} ${c.telp ?? ""}`.toLowerCase().includes(q)) : semua;
  const edit = editId ? semua.find((c) => c.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Tipe</th>
              <th className="px-4 py-3 font-medium">Telepon</th>
              <th className="px-4 py-3 font-medium">Catatan</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pelanggan.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Belum ada pelanggan{q ? " yang cocok" : ""}.</td></tr>
            )}
            {pelanggan.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">
                  {c.nama}
                  <p className="mt-0.5 text-xs text-muted">{c._count.sales} transaksi</p>
                </td>
                <td className="px-4 py-3">
                  {c.tipe === "MEMBER" ? (
                    <span className="inline-flex rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">member</span>
                  ) : (
                    <span className="chip">umum</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{c.telp ?? "—"}</td>
                <td className="px-4 py-3 max-w-48 truncate text-xs text-muted" title={c.catatan ?? undefined}>{c.catatan ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/pelanggan?edit=${c.id}#form`}
                    className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PelangganForm
        key={edit?.id ?? "baru"}
        initial={edit ? { id: edit.id, nama: edit.nama, telp: edit.telp ?? "", alamat: edit.alamat ?? "", tipe: edit.tipe, catatan: edit.catatan ?? "" } : undefined}
      />
    </div>
  );
}
