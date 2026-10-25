"use client";

import { toggleAktifPengguna } from "@/app/actions/pengguna";

export function ToggleAktifPenggunaButton({ userId, aktif, nama }: { userId: string; aktif: boolean; nama: string }) {
  const fn = toggleAktifPengguna.bind(null, userId);
  return (
    <form
      action={fn}
      onSubmit={(e) => {
        const pesan = aktif
          ? `Nonaktifkan ${nama}? Akun tidak bisa login sampai diaktifkan lagi.`
          : `Aktifkan kembali ${nama}?`;
        if (!confirm(pesan)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none transition-colors duration-150 hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {aktif ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </form>
  );
}
