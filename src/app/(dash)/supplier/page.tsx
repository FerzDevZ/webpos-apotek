import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { SupplierForm, HapusSupplierButton } from "./form-client";

export default function SupplierPage(props: PageProps<"/supplier">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Supplier</h1>
        <p className="mt-1 text-sm text-muted">PBF / distributor tempat apotek memesan barang.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <Isi sp={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Isi({ sp }: { sp: PageProps<"/supplier">["searchParams"] }) {
  await connection();
  const s = await sp;
  const editId = (s.edit ?? "").toString();
  const suppliers = await db.supplier.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { batches: true, purchases: true } } },
  });
  const edit = editId ? suppliers.find((s) => s.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Telepon</th>
              <th className="px-4 py-3 font-medium">Riwayat</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Belum ada supplier. Tambah lewat form di bawah.</td></tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.nama}</p>
                  {s.alamat && <p className="mt-0.5 text-xs text-muted">{s.alamat}</p>}
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{s.telp ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted">{s._count.purchases} faktur · {s._count.batches} batch</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <a
                      href={`/supplier?edit=${s.id}#form`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      Edit
                    </a>
                    {s._count.batches === 0 && s._count.purchases === 0 && <HapusSupplierButton id={s.id} nama={s.nama} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SupplierForm
        key={edit?.id ?? "baru"}
        initial={edit ? { id: edit.id, nama: edit.nama, telp: edit.telp ?? "", alamat: edit.alamat ?? "" } : undefined}
      />
    </div>
  );
}
