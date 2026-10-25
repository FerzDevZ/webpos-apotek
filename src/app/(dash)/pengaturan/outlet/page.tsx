import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/constants";
import { OutletForm } from "./outlet-form";

export default function PengaturanOutletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Pengaturan Outlet</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Identitas apotek — dipakai di struk, resep, dan laporan.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200" />}>
        <OutletFormAsync />
      </Suspense>
    </div>
  );
}

async function OutletFormAsync() {
  // Cek role sungguhan dari DB, bukan cuma dari cookie (proxy sudah cek optimis).
  await connection(); // query Prisma memakai waktu → wajib request-time
  const user = await getCurrentUser();
  if (user.role !== ROLE.ADMIN) redirect("/");

  const outlet = await db.outlet.findFirst({ orderBy: { createdAt: "asc" } });
  return (
    <OutletForm
      initial={{
        nama: outlet?.nama ?? "",
        alamat: outlet?.alamat ?? "",
        telp: outlet?.telp ?? "",
        apoteker: outlet?.apoteker ?? "",
        sia: outlet?.sia ?? "",
        sipa: outlet?.sipa ?? "",
        footer: outlet?.footer ?? "",
      }}
    />
  );
}
