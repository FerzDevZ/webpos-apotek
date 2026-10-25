"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { selesaikanPenjualan, cariItemKasir, type KasirState, type CariItemHasil } from "@/app/actions/kasir";
import { computeTotals, formatRupiah, saranBayar, parseUang } from "@/lib/money";

type Baris = {
  itemId: string;
  unitId: string;
  nama: string;
  units: CariItemHasil["units"];
  qtyUnit: number;
  satuanDasar: string;
  stokLayak: number;
};

export function KasirLayar({ pelanggan }: { pelanggan: { id: string; nama: string; tipe: string }[] }) {
  const [state, action, pending] = useActionState<KasirState, FormData>(selesaikanPenjualan, null);

  const [kataKunci, setKataKunci] = useState("");
  const [hasil, setHasil] = useState<CariItemHasil[]>([]);
  const [mencari, mulaiCari] = useTransition();
  const [baris, setBaris] = useState<Baris[]>([]);
  const [diskonNota, setDiskonNota] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("TUNAI");
  const [bayar, setBayar] = useState("");
  const [customerId, setCustomerId] = useState("");
  const inputCari = useRef<HTMLInputElement>(null);

  // debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => {
      mulaiCari(async () => {
        const h = await cariItemKasir(kataKunci);
        setHasil(h);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [kataKunci, mulaiCari]);

  const lines = baris.map((b) => ({ hargaSatuan: hargaBaris(b), qtyUnit: b.qtyUnit }));
  const totals = computeTotals(lines, parseUang(diskonNota));
  const kembali = Math.max(0, parseUang(bayar) - totals.total);
  const kurang = parseUang(bayar) > 0 && parseUang(bayar) < totals.total;
  const saran = saranBayar(totals.total);

  function tambah(item: CariItemHasil) {
    if (item.requiresResep) return;
    const sudah = baris.find((b) => b.itemId === item.id);
    if (sudah) {
      setBaris(baris.map((b) => (b.itemId === item.id ? { ...b, qtyUnit: b.qtyUnit + 1 } : b)));
      return;
    }
    const unit = item.units.find((u) => u.isDefault) ?? item.units.find((u) => u.faktor === 1);
    if (!unit) return;
    setBaris([
      ...baris,
      { itemId: item.id, unitId: unit.id, nama: item.nama, units: item.units, qtyUnit: 1, satuanDasar: item.satuanDasar, stokLayak: item.stokLayak },
    ]);
  }

  const bisaBayar = baris.length > 0 && (metodeBayar !== "TUNAI" || parseUang(bayar) >= totals.total);

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <input type="hidden" name="linesJson" value={JSON.stringify(baris.map((b) => ({ itemId: b.itemId, unitId: b.unitId, qtyUnit: b.qtyUnit })))} />
      <input type="hidden" name="diskonNota" value={parseUang(diskonNota)} />
      <input type="hidden" name="metodeBayar" value={metodeBayar} />
      <input type="hidden" name="bayar" value={parseUang(bayar)} />
      <input type="hidden" name="customerId" value={customerId} />

      {/* Kolom kiri: cari + hasil */}
      <div className="space-y-3">
        <input
          ref={inputCari}
          type="search"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari nama / kode / scan barcode…"
          aria-label="Cari barang"
          autoFocus
          className="input py-3 text-base"
        />

        <div className="card divide-y divide-line overflow-hidden">
          {mencari && <p className="px-4 py-3 text-sm text-muted">mencari…</p>}
          {!mencari && hasil.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Tidak ada barang yang cocok{ kataKunci ? "" : " — ketik untuk mencari" }.
            </p>
          )}
          {hasil.map((item) => {
            const habis = item.stokLayak <= 0;
            const terkunci = item.requiresResep;
            const dipilih = baris.find((b) => b.itemId === item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !terkunci && !habis && tambah(item)}
                disabled={terkunci || habis}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                  terkunci || habis ? "cursor-not-allowed opacity-60" : "hover:bg-inset"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.nama}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted">
                    {item.kode}
                    {terkunci ? " · wajib resep — layani lewat modul Resep" : habis ? " · stok habis" : ` · stok ${item.stokLayak} ${item.satuanDasar}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {dipilih && <span className="mr-2 inline-flex rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">×{dipilih.qtyUnit}</span>}
                  <span className="text-sm font-semibold tabular-nums">
                    {formatRupiah((item.units.find((u) => u.isDefault) ?? item.units.find((u) => u.faktor === 1))?.hargaJual ?? 0)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kolom kanan: keranjang + bayar */}
      <div className="space-y-3">
        <div className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Keranjang ({baris.length})
          </h2>
          {baris.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Pilih barang dari daftar kiri.</p>
          ) : (
            <ul className="divide-y divide-line">
              {baris.map((b, i) => {
                const unit = b.units.find((u) => u.id === b.unitId) ?? b.units[0];
                const unitLain = b.units.filter((u) => u.faktor > 1).length > 0;
                const melebihi = b.qtyUnit * (unit?.faktor ?? 1) > b.stokLayak;
                return (
                  <li key={b.itemId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{b.nama}</p>
                      <button
                        type="button"
                        onClick={() => setBaris(baris.filter((_, j) => j !== i))}
                        aria-label={`Hapus ${b.nama}`}
                        className="rounded-md p-1 text-muted outline-none hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => setBaris(baris.map((x, j) => (j === i ? { ...x, qtyUnit: Math.max(1, x.qtyUnit - 1) } : x)))}
                          aria-label="Kurangi"
                          className="px-2.5 py-1 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          value={b.qtyUnit}
                          onChange={(e) => setBaris(baris.map((x, j) => (j === i ? { ...x, qtyUnit: Math.max(1, Number(e.target.value) || 1) } : x)))}
                          aria-label={`Jumlah ${b.nama}`}
                          className="w-12 border-x border-line bg-transparent py-1 text-center text-sm tabular-nums outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setBaris(baris.map((x, j) => (j === i ? { ...x, qtyUnit: x.qtyUnit + 1 } : x)))}
                          aria-label="Tambah"
                          className="px-2.5 py-1 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand"
                        >+</button>
                      </div>
                      {unitLain && (
                        <select
                          value={b.unitId}
                          onChange={(e) => setBaris(baris.map((x, j) => (j === i ? { ...x, unitId: e.target.value } : x)))}
                          aria-label={`Satuan ${b.nama}`}
                          className="input w-auto py-1 text-xs"
                        >
                          {b.units.map((u) => (
                            <option key={u.id} value={u.id}>{u.nama}</option>
                          ))}
                        </select>
                      )}
                      <p className={`ml-auto text-sm tabular-nums ${melebihi ? "font-semibold text-danger" : "font-medium"}`}>
                        {formatRupiah(hargaBaris(b) * b.qtyUnit)}
                      </p>
                    </div>
                    {melebihi && <p className="mt-1 text-xs text-danger">Melebihi stok ({b.stokLayak} {b.satuanDasar})</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="block">
              <span className="block text-xs font-medium text-ink-2">Diskon nota (Rp)</span>
              <input inputMode="numeric" value={diskonNota} onChange={(e) => setDiskonNota(e.target.value)} placeholder="0" className="input mt-1 py-1.5 tabular-nums" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-2">Pelanggan</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input mt-1 py-1.5">
                <option value="">— umum —</option>
                {pelanggan.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}{p.tipe === "MEMBER" ? " ★" : ""}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-sm text-ink-2">Total</span>
            <span className="font-display text-2xl font-bold tabular-nums">{formatRupiah(totals.total)}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(["TUNAI", "QRIS", "DEBIT", "TRANSFER"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodeBayar(m)}
                aria-pressed={metodeBayar === m}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand ${
                  metodeBayar === m ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-2 hover:bg-inset"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {metodeBayar === "TUNAI" && (
            <div>
              <label className="block text-xs font-medium text-ink-2">Uang diterima</label>
              <input
                inputMode="numeric"
                value={bayar}
                onChange={(e) => setBayar(e.target.value)}
                placeholder="0"
                className="input mt-1 py-2 text-right text-lg font-semibold tabular-nums"
              />
              {saran.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {saran.map((v) => (
                    <button key={v} type="button" onClick={() => setBayar(String(v))} className="chip cursor-pointer font-semibold hover:bg-brand-soft hover:text-brand-ink">
                      {formatRupiah(v)}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between text-sm">
                <span className={kurang ? "font-medium text-danger" : "text-ink-2"}>{kurang ? "Kurang" : "Kembali"}</span>
                <span className={`tabular-nums ${kurang ? "font-bold text-danger" : "font-bold"}`}>
                  {formatRupiah(kurang ? totals.total - parseUang(bayar) : kembali)}
                </span>
              </div>
            </div>
          )}

          {state?.error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <button type="submit" disabled={pending || !bisaBayar} className="btn btn-primary w-full py-3 text-base disabled:opacity-50">
            {pending ? "Memproses…" : kurang ? "Uang kurang" : `Bayar ${formatRupiah(totals.total)}`}
          </button>
        </div>
      </div>
    </form>
  );
}

function hargaBaris(b: Baris): number {
  return b.units.find((u) => u.id === b.unitId)?.hargaJual ?? b.units[0]?.hargaJual ?? 0;
}
