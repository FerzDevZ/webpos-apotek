"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { simpanResep, type ResepState } from "@/app/actions/resep";

export type ResepItemOpsi = {
  id: string;
  nama: string;
  satuanDasar: string;
  golongan: string;
  requiresResep: boolean;
};

type BarisNon = { itemId: string; jumlah: string; signa: string };
type BarisRacik = { itemId: string; namaBahan: string; jumlah: string; jumlahDosis: string; subtotal: string };

const SIGNA_PRESET = [
  "3 x 1 tablet sesudah makan",
  "3 x 1 tablet sebelum makan",
  "2 x 1 tablet sesudah makan",
  "1 x 1 tablet malam sebelum tidur",
  "3 x 1 kapsul sesudah makan",
  "1 x 1 botol",
  "Sekali pakai",
];

export function ResepForm({ items, pelanggan }: { items: ResepItemOpsi[]; pelanggan: { id: string; nama: string }[] }) {
  const [state, action, pending] = useActionState<ResepState, FormData>(simpanResep, null);
  const [tipe, setTipe] = useState<"NON_RACIKAN" | "RACIKAN">("NON_RACIKAN");

  const [pasienNama, setPasienNama] = useState("");
  const [pasienTelp, setPasienTelp] = useState("");
  const [umur, setUmur] = useState("");
  const [dokter, setDokter] = useState("");
  const [noSIP, setNoSIP] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [iter, setIter] = useState("1");
  const [catatan, setCatatan] = useState("");

  const [nonRacikan, setNonRacikan] = useState<BarisNon[]>([{ itemId: "", jumlah: "1", signa: SIGNA_PRESET[0] }]);
  const [racikan, setRacikan] = useState<BarisRacik[]>([{ itemId: "", namaBahan: "", jumlah: "1", jumlahDosis: "1", subtotal: "" }]);

  const nonRacikanJson = JSON.stringify(nonRacikan.filter((b) => b.itemId));
  const racikanJson = JSON.stringify(
    racikan
      .filter((b) => b.namaBahan.trim())
      .map((b) => ({ itemId: b.itemId || undefined, namaBahan: b.namaBahan.trim(), jumlah: b.jumlah, jumlahDosis: Number(b.jumlahDosis) || 1, subtotalManual: Number(b.subtotal) || 0 })),
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tipe" value={tipe} />
      <input type="hidden" name="nonRacikanJson" value={nonRacikanJson} />
      <input type="hidden" name="racikanJson" value={racikanJson} />

      <div className="card p-5">
        <h2 className="text-sm font-semibold">Pasien &amp; dokter</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="pasienNama" className="block text-sm font-medium text-ink-2">Nama pasien <span className="text-danger">*</span></label>
            <input id="pasienNama" name="pasienNama" required value={pasienNama} onChange={(e) => setPasienNama(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label htmlFor="pasienTelp" className="block text-sm font-medium text-ink-2">Telepon</label>
            <input id="pasienTelp" name="pasienTelp" value={pasienTelp} onChange={(e) => setPasienTelp(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label htmlFor="umur" className="block text-sm font-medium text-ink-2">Umur (tahun)</label>
            <input id="umur" name="umur" type="number" min={0} max={150} value={umur} onChange={(e) => setUmur(e.target.value)} className="input mt-1 tabular-nums" />
          </div>
          <div>
            <label htmlFor="dokter" className="block text-sm font-medium text-ink-2">Dokter <span className="text-danger">*</span></label>
            <input id="dokter" name="dokter" required value={dokter} onChange={(e) => setDokter(e.target.value)} className="input mt-1" placeholder="dr. …, Sp.…" />
          </div>
          <div>
            <label htmlFor="noSIP" className="block text-sm font-medium text-ink-2">No. SIP dokter</label>
            <input id="noSIP" name="noSIP" value={noSIP} onChange={(e) => setNoSIP(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label htmlFor="customerId" className="block text-sm font-medium text-ink-2">Pelanggan terdaftar</label>
            <select id="customerId" name="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input mt-1">
              <option value="">— pasien baru —</option>
              {pelanggan.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Isi resep</h2>
          <div className="flex rounded-lg border border-line p-0.5 text-xs font-semibold">
            <button type="button" onClick={() => setTipe("NON_RACIKAN")} aria-pressed={tipe === "NON_RACIKAN"} className={`rounded-md px-3 py-1.5 outline-none focus-visible:outline-2 focus-visible:outline-brand ${tipe === "NON_RACIKAN" ? "bg-brand-soft text-brand-ink" : "text-ink-2"}`}>
              Non-racikan
            </button>
            <button type="button" onClick={() => setTipe("RACIKAN")} aria-pressed={tipe === "RACIKAN"} className={`rounded-md px-3 py-1.5 outline-none focus-visible:outline-2 focus-visible:outline-brand ${tipe === "RACIKAN" ? "bg-brand-soft text-brand-ink" : "text-ink-2"}`}>
              Racikan
            </button>
          </div>
        </div>

        {tipe === "NON_RACIKAN" ? (
          <div className="mt-4 space-y-2">
            {nonRacikan.map((b, i) => {
              const item = items.find((it) => it.id === b.itemId);
              return (
                <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.6fr_96px_1.4fr_32px] sm:items-end">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Obat</span>
                    <select value={b.itemId} onChange={(e) => setNonRacikan(nonRacikan.map((x, j) => (j === i ? { ...x, itemId: e.target.value } : x)))} className="input py-1.5">
                      <option value="">— pilih obat —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.nama}{it.requiresResep ? " (keras)" : ""}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Jumlah ({item?.satuanDasar ?? "dasar"})</span>
                    <input value={b.jumlah} onChange={(e) => setNonRacikan(nonRacikan.map((x, j) => (j === i ? { ...x, jumlah: e.target.value } : x)))} className="input py-1.5 tabular-nums" placeholder="boleh 0.5" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Aturan pakai</span>
                    <input list="preset-signa" value={b.signa} onChange={(e) => setNonRacikan(nonRacikan.map((x, j) => (j === i ? { ...x, signa: e.target.value } : x)))} className="input py-1.5" placeholder="3 x 1 tablet sesudah makan" />
                  </label>
                  <button type="button" onClick={() => setNonRacikan(nonRacikan.length > 1 ? nonRacikan.filter((_, j) => j !== i) : [{ itemId: "", jumlah: "1", signa: SIGNA_PRESET[0] }])} aria-label={`Hapus baris ${i + 1}`} className="justify-self-end rounded-md p-2 text-muted outline-none hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand">
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
              );
            })}
            <datalist id="preset-signa">
              {SIGNA_PRESET.map((s) => (<option key={s} value={s} />))}
            </datalist>
            <button type="button" onClick={() => setNonRacikan([...nonRacikan, { itemId: "", jumlah: "1", signa: SIGNA_PRESET[0] }])} className="btn btn-outline px-3 py-1.5 text-xs">
              + Tambah obat
            </button>
            <p className="text-xs text-muted">Jumlah boleh pecahan (0.5 tablet) — dihitung dari resep dokter, dibulatkan ke atas saat pengambilan stok.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {racikan.map((b, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.4fr_1.2fr_88px_88px_1.1fr_32px] sm:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-2">Bahan (stok)</span>
                  <select value={b.itemId} onChange={(e) => setRacikan(racikan.map((x, j) => (j === i ? { ...x, itemId: e.target.value } : x)))} className="input py-1.5">
                    <option value="">— non-stok —</option>
                    {items.map((it) => (<option key={it.id} value={it.id}>{it.nama}</option>))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-2">Nama bahan <span className="text-danger">*</span></span>
                  <input value={b.namaBahan} onChange={(e) => setRacikan(racikan.map((x, j) => (j === i ? { ...x, namaBahan: e.target.value } : x)))} className="input py-1.5" placeholder="Sirup lobelia…" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-2">Takaran</span>
                  <input value={b.jumlah} onChange={(e) => setRacikan(racikan.map((x, j) => (j === i ? { ...x, jumlah: e.target.value } : x)))} className="input py-1.5 tabular-nums" placeholder="5 ml" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-2">Dosis</span>
                  <input type="number" min={1} value={b.jumlahDosis} onChange={(e) => setRacikan(racikan.map((x, j) => (j === i ? { ...x, jumlahDosis: e.target.value } : x)))} className="input py-1.5 tabular-nums" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-2">Harga total</span>
                  <input inputMode="numeric" value={b.subtotal} onChange={(e) => setRacikan(racikan.map((x, j) => (j === i ? { ...x, subtotal: e.target.value } : x)))} className="input py-1.5 tabular-nums" placeholder="Rp" />
                </label>
                <button type="button" onClick={() => setRacikan(racikan.length > 1 ? racikan.filter((_, j) => j !== i) : [{ itemId: "", namaBahan: "", jumlah: "1", jumlahDosis: "1", subtotal: "" }])} aria-label={`Hapus bahan ${i + 1}`} className="justify-self-end rounded-md p-2 text-muted outline-none hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand">
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setRacikan([...racikan, { itemId: "", namaBahan: "", jumlah: "1", jumlahDosis: "1", subtotal: "" }])} className="btn btn-outline px-3 py-1.5 text-xs">
              + Tambah bahan
            </button>
            <p className="text-xs text-muted">Bahan non-stok (mis. air demineral) biarkan pilihan &ldquo;— non-stok —&rdquo;. Harga racikan diisi manual per racikan.</p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold">Pengulangan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="iter" className="block text-sm font-medium text-ink-2">Iter (boleh dilayani)</label>
            <input id="iter" name="iter" type="number" min={1} max={99} value={iter} onChange={(e) => setIter(e.target.value)} className="input mt-1 tabular-nums" />
            <p className="mt-1 text-xs text-muted">1 = sekali saja, sesuai tulisan dokter.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="catatan" className="block text-sm font-medium text-ink-2">Catatan</label>
            <input id="catatan" name="catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} className="input mt-1" placeholder="opsional" />
          </div>
        </div>
      </div>

      {state?.error && <div role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</div>}

      <div className="flex justify-end gap-2">
        <Link href="/resep" className="btn btn-outline">Batal</Link>
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Menyimpan…" : "Simpan resep"}</button>
      </div>
    </form>
  );
}
