import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { KasirLayar } from "./kasir-layar";

export default function KasirPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Kasir</h1>
        <p className="mt-1 text-sm text-muted">
          Batch dipilih otomatis FEFO. Obat wajib resep dilayani lewat modul Resep.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <Layar />
      </Suspense>
    </div>
  );
}

async function Layar() {
  await connection();
  const pelanggan = await db.customer.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, tipe: true },
    take: 200,
  });
  return <KasirLayar pelanggan={pelanggan} />;
}
