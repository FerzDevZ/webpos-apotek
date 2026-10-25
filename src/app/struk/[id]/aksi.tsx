"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { voidPenjualan } from "@/app/actions/kasir";

export function StrukAksi({
  saleId,
  metodeBayar,
  total,
  cetakOtomatis,
  voidDisabled = false,
}: {
  saleId: string;
  metodeBayar: string;
  total: number;
  cetakOtomatis: boolean;
  voidDisabled?: boolean;
}) {
  const router = useRouter();
  const [pesanVoid, setPesanVoid] = useState<string | null>(null);

  useEffect(() => {
    if (cetakOtomatis) {
      // tunggu frame berikut supaya font & layout selesai sebelum dialog cetak
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [cetakOtomatis]);

  return (
    <div className="flex items-center gap-2">
      {pesanVoid && <span className="text-xs text-danger">{pesanVoid}</span>}
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white outline-none transition-colors duration-150 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand print:hidden"
      >
        Cetak struk
      </button>
      {!voidDisabled && (
        <button
          type="button"
          onClick={async () => {
            const alasan = window.prompt(`Batalkan struk (${metodeBayar}, total ${total})?\nStok akan dikembalikan ke batch semula. Tulis alasannya:`);
            if (alasan === null) return;
            const hasil = await voidPenjualan(saleId, alasan ?? "");
            if (hasil?.error) setPesanVoid(hasil.error);
            else router.refresh();
          }}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 outline-none transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand print:hidden"
        >
          Void
        </button>
      )}
    </div>
  );
}
