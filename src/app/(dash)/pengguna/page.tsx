import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/constants";
import { BuatPenggunaForm, ResetPasswordButton } from "./form-client";
import { ToggleAktifPenggunaButton } from "./toggle";

export default function PenggunaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Pengguna</h1>
        <p className="mt-1 text-sm text-muted">Akun staf apotek dan perannya.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
        <Isi />
      </Suspense>
    </div>
  );
}

async function Isi() {
  await connection();
  const saya = await getCurrentUser();
  if (saya.role !== ROLE.ADMIN) redirect("/");

  const users = await db.user.findMany({
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    select: { id: true, nama: true, email: true, role: true, aktif: true, createdAt: true },
  });

  const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", APOTEKER: "Apoteker", KASIR: "Kasir" };

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">
                  {u.nama}
                  {u.id === saya.id && <span className="ml-1.5 text-xs text-muted">(Anda)</span>}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{u.email}</td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  {u.aktif ? (
                    <span className="inline-flex rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">aktif</span>
                  ) : (
                    <span className="chip">nonaktif</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <ResetPasswordButton userId={u.id} nama={u.nama} />
                    {u.id !== saya.id && <ToggleAktifPenggunaButton userId={u.id} aktif={u.aktif} nama={u.nama} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BuatPenggunaForm />
    </div>
  );
}
