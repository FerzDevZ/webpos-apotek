import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { db } from "@/lib/db";
import { ResepForm, type ResepItemOpsi } from "../resep-form";

export default function ResepBaruPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Input Resep</h1>
        <p className="mt-1 text-sm text-muted">Catat resep dokter. Penjualan stok baru terjadi saat tombol &ldquo;Proses ke penjualan&rdquo;.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <FormAsync />
      </Suspense>
    </div>
  );
}

async function FormAsync() {
  await connection();
  const user = await getCurrentUser();
  if (user.role !== ROLE.ADMIN && user.role !== ROLE.APOTEKER) redirect("/resep");

  const [items, pelanggan] = await Promise.all([
    db.item.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, satuanDasar: true, golongan: true, requiresResep: true },
    }),
    db.customer.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true }, take: 200 }),
  ]);

  const opsi: ResepItemOpsi[] = items.map((i) => ({ ...i, requiresResep: i.requiresResep || ["KERAS", "NARKOTIKA", "PSIKOTROPIKA", "BEBAS_TERBATAS"].includes(i.golongan) }));
  return <ResepForm items={opsi} pelanggan={pelanggan} />;
}
