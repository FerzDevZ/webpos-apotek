import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatStok, type Satuan } from "@/lib/units";
import { daysUntil } from "@/lib/fefo";
import { SesuaikanForm } from "../../form-client";

export default function SesuaikanPage(props: PageProps<"/stok/sesuaikan/[batchId]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
      <Sesuaikan idPromise={props.params} />
    </Suspense>
  );
}

async function Sesuaikan({ idPromise }: { idPromise: Promise<{ batchId: string }> }) {
  await connection();
  const { batchId } = await idPromise;
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: { item: { select: { nama: true, satuanDasar: true, units: true } } },
  });
  if (!batch) notFound();
  const satuan = batch.item.units as Satuan[];

  return (
    <div className="space-y-4">
      <div>
        <Link href="/stok" className="text-xs font-medium text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
          ← Stok &amp; Kadaluarsa
        </Link>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">Sesuaikan stok</h1>
        <p className="mt-1 text-sm text-muted">
          {batch.item.nama} · batch <span className="font-mono text-[13px]">{batch.noBatch}</span> · sisa{" "}
          {formatStok(batch.qtySisa, satuan)} · ED {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(batch.expiry)}
          {" "}({daysUntil(batch.expiry)} hari)
        </p>
      </div>
      <SesuaikanForm batchId={batch.id} stok={batch.qtySisa} />
    </div>
  );
}
