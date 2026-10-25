/**
 * Shell aplikasi (sidebar + header). Catatan cacheComponents: pembacaan sesi
 * TIDAK boleh di top-level layout — semua yang menyentuh cookies() harus di
 * dalam <Suspense> supaya shell tetap instan.
 */
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar, MobileNav } from "./sidebar";
import { HeaderBar } from "./header";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <Suspense
        fallback={<aside className="hidden w-60 shrink-0 border-r border-line bg-card lg:block" />}
      >
        <SidebarAsync />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-line bg-card" />}>
          <HeaderAsync />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

async function SidebarAsync() {
  const user = await getCurrentUser();
  return <Sidebar role={user.role} />;
}

async function HeaderAsync() {
  await connection(); // header menampilkan tanggal hari ini → request-time
  const user = await getCurrentUser();
  return (
    <>
      <HeaderBar nama={user.nama} role={user.role} />
      <MobileNav role={user.role} />
    </>
  );
}
