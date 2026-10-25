import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { PembelianForm, type ItemOpsi } from "./pembelian-form";

export default function PembelianBaruPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Terima Faktur</h1>
        <p className="mt-1 text-sm text-muted">
          Setiap baris membuat atau menambah batch. Batch dengan nomor &amp; kadaluarsa sama otomatis dijumlahkan.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <FormAsync />
      </Suspense>
    </div>
  );
}

async function FormAsync() {
  await connection();
  const [items, suppliers] = await Promise.all([
    db.item.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, satuanDasar: true, units: { select: { id: true, nama: true, faktor: true }, orderBy: { faktor: "desc" } } },
    }),
    db.supplier.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  const opsi: ItemOpsi[] = items.map((i) => ({
    id: i.id,
    nama: i.nama,
    satuanDasar: i.satuanDasar,
    units: i.units.map((u) => ({ id: u.id, nama: u.nama, faktor: u.faktor })),
  }));

  return <PembelianForm items={opsi} suppliers={suppliers} />;
}
