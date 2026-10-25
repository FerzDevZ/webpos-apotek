"use client";

import { useActionState } from "react";
import { sesuaikanStok, buangBatch, type StokState } from "@/app/actions/stok";

export function SesuaikanForm({ batchId, stok }: { batchId: string; stok: number }) {
  const [state, action, pending] = useActionState<StokState, FormData>(sesuaikanStok, null);

  return (
    <form action={action} className="card max-w-lg p-5">
      <input type="hidden" name="batchId" value={batchId} />
      <label htmlFor="selisih" className="block text-sm font-medium text-ink-2">
        Selisih hasil hitung fisik <span className="text-danger">*</span>
      </label>
      <input
        id="selisih"
        name="selisih"
        type="number"
        step={1}
        required
        className="input mt-1 tabular-nums"
        placeholder={`positif menambah, negatif mengurangi (stok sekarang ${stok})`}
      />
      <p className="mt-1.5 text-xs text-muted">Contoh: -3 = opname menemukan kurang 3 tablet; 10 = ada kelebihan 10.</p>

      <label htmlFor="alasan" className="mt-4 block text-sm font-medium text-ink-2">
        Alasan <span className="text-danger">*</span>
      </label>
      <input id="alasan" name="alasan" required className="input mt-1" placeholder="Stock opname bulan ini" />

      {state?.error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.sukses && <p className="mt-3 text-sm font-medium text-brand-ink">Stok disesuaikan. Kartu stok tercatat.</p>}

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Menyimpan…" : "Sesuaikan"}</button>
      </div>
    </form>
  );
}

export function BuangForm({ batchId, stok }: { batchId: string; stok: number }) {
  const [state, action, pending] = useActionState<StokState, FormData>(buangBatch, null);

  return (
    <form action={action} className="card max-w-lg p-5">
      <input type="hidden" name="batchId" value={batchId} />
      <label htmlFor="qty" className="block text-sm font-medium text-ink-2">
        Jumlah dibuang (satuan dasar) <span className="text-danger">*</span>
      </label>
      <input id="qty" name="qty" type="number" min={1} max={stok} step={1} required defaultValue={stok} className="input mt-1 tabular-nums" />
      <p className="mt-1.5 text-xs text-muted">Maksimal {stok} (sisa batch ini).</p>

      <label htmlFor="alasan" className="mt-4 block text-sm font-medium text-ink-2">
        Alasan <span className="text-danger">*</span>
      </label>
      <select id="alasan" name="alasan" className="input mt-1" defaultValue="EXPIRED">
        <option value="EXPIRED">Kedaluwarsa</option>
        <option value="RUSAK">Rusak</option>
        <option value="RETUR_PBF">Retur ke PBF</option>
      </select>

      <label htmlFor="catatan" className="mt-4 block text-sm font-medium text-ink-2">Catatan</label>
      <input id="catatan" name="catatan" className="input mt-1" placeholder="opsional" />

      {state?.error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.sukses && <p className="mt-3 text-sm font-medium text-brand-ink">Pembuangan tercatat.</p>}

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Menyimpan…" : "Catat pembuangan"}</button>
      </div>
    </form>
  );
}
