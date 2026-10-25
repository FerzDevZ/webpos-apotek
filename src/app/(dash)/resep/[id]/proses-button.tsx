"use client";

import { useState, useTransition } from "react";
import { prosesResepKePenjualan } from "@/app/actions/resep";

export function ProsesResepButton({ resepId }: { resepId: string }) {
  const [pending, mulai] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Proses resep menjadi penjualan dan kurangi stok sekarang?")) return;
          mulai(async () => {
            const hasil = await prosesResepKePenjualan(resepId);
            if (hasil?.error) setPesan(hasil.error);
          });
        }}
        className="btn btn-primary w-full py-2.5"
      >
        {pending ? "Memproses…" : "Proses ke penjualan"}
      </button>
      {pesan && <p role="alert" className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{pesan}</p>}
    </div>
  );
}
