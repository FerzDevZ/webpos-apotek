import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { ItemForm } from "../item-form";

export default function ObatBaruPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tambah Obat</h1>
        <p className="mt-1 text-sm text-muted">Daftarkan item baru beserta satuan jual dan harganya.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <FormGuard />
      </Suspense>
    </div>
  );
}

async function FormGuard() {
  await connection();
  const user = await getCurrentUser();
  if (user.role !== ROLE.ADMIN && user.role !== ROLE.APOTEKER) redirect("/obat");
  return <ItemForm />;
}
