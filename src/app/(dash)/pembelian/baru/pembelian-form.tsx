"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { simpanPembelian, type PembelianState } from "@/app/actions/pembelian";
import { formatRupiah, parseUang } from "@/lib/money";

export type ItemOpsi = {
  id: string;
  nama: string;
  satuanDasar: string;
  units: { id: string; nama: string; faktor: number }[];
};

type Baris = { itemId: string; unitId: string; qtyUnit: string; hargaBeliUnit: string; noBatch: string; expiry: string };

function barisKosong(): Baris {
  return { itemId: "", unitId: "", qtyUnit: "", hargaBeliUnit: "", noBatch: "", expiry: "" };
}

export function PembelianForm({ items, suppliers }: { items: ItemOpsi[]; suppliers: { id: string; nama: string }[] }) {
  const [state, action, pending] = useActionState<PembelianState, FormData>(simpanPembelian, null);
  const [faktur, setFaktur] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [baris, setBaris] = useState<Baris[]>([barisKosong()]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const ubah = (i: number, patch: Partial<Baris>) =>
    setBaris(baris.map((b, j) => {
      if (j !== i) return b;
      const next = { ...b, ...patch };
      // ganti item -> reset unit ke satuan dasar
      if (patch.itemId && patch.itemId !== b.itemId) {
        const item = itemMap.get(patch.itemId);
        const dasar = item?.units.find((u) => u.faktor === 1);
        next.unitId = dasar?.id ?? "";
      }
      return next;
    }));

  const rowsJson = JSON.stringify(
    baris
      .filter((b) => b.itemId !== "" && Number(b.qtyUnit) > 0)
      .map((b) => ({
        itemId: b.itemId,
        unitId: b.unitId || undefined,
        qtyUnit: Number(b.qtyUnit),
        hargaBeliUnit: parseUang(b.hargaBeliUnit),
        noBatch: b.noBatch.trim(),
        expiry: b.expiry,
      })),
  );

  const totalPreview = baris.reduce((a, b) => a + parseUang(b.hargaBeliUnit) * (Number(b.qtyUnit) || 0), 0);
  const expiryMin = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rowsJson" value={rowsJson} />

      <div className="card p-5">
        <h2 className="text-sm font-semibold">Faktur</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="noFaktur" className="block text-sm font-medium text-ink-2">No. faktur PBF <span className="text-danger">*</span></label>
            <input id="noFaktur" name="noFaktur" required value={faktur} onChange={(e) => setFaktur(e.target.value)} className="input mt-1 font-mono text-[13px]" placeholder="FKT-2026-001234" />
          </div>
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-ink-2">Supplier</label>
            <select id="supplierId" name="supplierId" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input mt-1">
              <option value="">— tanpa supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="catatan" className="block text-sm font-medium text-ink-2">Catatan</label>
            <input id="catatan" name="catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} className="input mt-1" placeholder="pengiriman siang…" />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Barang diterima</h2>
          <button type="button" onClick={() => setBaris([...baris, barisKosong()])} className="btn btn-outline px-3 py-1.5 text-xs">
            + Tambah baris
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {baris.map((b, i) => {
            const item = itemMap.get(b.itemId);
            const unit = item?.units.find((u) => u.id === b.unitId) ?? item?.units.find((u) => u.faktor === 1);
            const subtotal = parseUang(b.hargaBeliUnit) * (Number(b.qtyUnit) || 0);
            return (
              <fieldset key={i} className="rounded-xl border border-line p-3">
                <legend className="px-1 text-xs font-semibold text-muted">Baris {i + 1}{subtotal > 0 ? ` · ${formatRupiah(subtotal)}` : ""}</legend>
                <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr_96px_1.2fr_1.2fr_32px] sm:items-end">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Barang</span>
                    <select value={b.itemId} onChange={(e) => ubah(i, { itemId: e.target.value })} className="input py-1.5">
                      <option value="">— pilih —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.nama}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Satuan</span>
                    <select value={b.unitId} onChange={(e) => ubah(i, { unitId: e.target.value })} className="input py-1.5" disabled={!item}>
                      {item ? item.units.map((u) => (
                        <option key={u.id} value={u.id}>{u.nama}{u.faktor > 1 ? ` (${u.faktor})` : ""}</option>
                      )) : <option>—</option>}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Qty</span>
                    <input type="number" min={1} step={1} value={b.qtyUnit} onChange={(e) => ubah(i, { qtyUnit: e.target.value })} className="input py-1.5 tabular-nums" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Harga beli{unit && unit.faktor > 1 ? ` /${unit.nama}` : ""}</span>
                    <input inputMode="numeric" value={b.hargaBeliUnit} onChange={(e) => ubah(i, { hargaBeliUnit: e.target.value })} className="input py-1.5 tabular-nums" placeholder="0" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-2">No. batch</span>
                      <input value={b.noBatch} onChange={(e) => ubah(i, { noBatch: e.target.value })} className="input py-1.5 font-mono text-[13px]" placeholder="PRC24A" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-2">Kadaluarsa</span>
                      <input type="date" min={expiryMin} value={b.expiry} onChange={(e) => ubah(i, { expiry: e.target.value })} className="input py-1.5" />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBaris(baris.length > 1 ? baris.filter((_, j) => j !== i) : [barisKosong()])}
                    aria-label={`Hapus baris ${i + 1}`}
                    className="justify-self-end rounded-md p-2 text-muted outline-none transition-colors duration-150 hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <p className="text-sm text-muted">Total faktur</p>
          <p className="font-display text-lg font-bold tabular-nums">{formatRupiah(totalPreview)}</p>
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</div>
      )}

      <div className="flex justify-end gap-2">
        <Link href="/pembelian" className="btn btn-outline">Batal</Link>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Menyimpan…" : "Simpan faktur & terima stok"}
        </button>
      </div>
    </form>
  );
}
