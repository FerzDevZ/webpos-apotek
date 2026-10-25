"use client";

import { toggleAktifItem } from "@/app/actions/obat";

export function ToggleAktif({ itemId, aktif, nama }: { itemId: string; aktif: boolean; nama: string }) {
  const fn = toggleAktifItem.bind(null, itemId);
  return (
    <form
      action={fn}
      onSubmit={(e) => {
        const pesan = aktif
          ? `Nonaktifkan "${nama}"? Item tidak akan muncul di kasir lagi. Riwayat penjualan lama tetap aman.`
          : `Aktifkan kembali "${nama}"?`;
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
