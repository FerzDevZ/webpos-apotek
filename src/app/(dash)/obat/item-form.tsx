"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { simpanItem, type ItemState } from "@/app/actions/obat";
import { GOLONGAN_LABEL, WAJIB_RESEP, type Golongan } from "@/lib/constants";

export type ItemInitial = {
  id?: string;
  kode?: string;
  barcode?: string;
  nama?: string;
  kategori?: string;
  pabrik?: string;
  golongan?: Golongan;
  satuanDasar?: string;
  hargaJualDasar?: number;
  stokMinDasar?: number;
  requiresResep?: boolean;
  bahanRacikan?: boolean;
  jualBebas?: boolean;
  defaultNama?: string;
  /** baris satuan tambahan (tanpa satuan dasar) */
  units?: { nama: string; faktor: number; hargaJual: number }[];
};

type Baris = { nama: string; faktor: string; hargaJual: string };

const SATUAN_DASAR_SARAN = ["tablet", "kapsul", "pcs", "botol", "tube", "ml", "sachet"];

const DASAR = "__dasar__";

export function ItemForm({ initial = {} }: { initial?: ItemInitial }) {
  const [state, action, pending] = useActionState<ItemState, FormData>(simpanItem, null);

  const [golongan, setGolongan] = useState<Golongan>(initial.golongan ?? "BEBAS");
  const [requiresResep, setRequiresResep] = useState(initial.requiresResep ?? false);
  const [bahanRacikan, setBahanRacikan] = useState(initial.bahanRacikan ?? false);
  const [jualBebas, setJualBebas] = useState(initial.jualBebas ?? true);

  const [satuanDasar, setSatuanDasar] = useState(initial.satuanDasar ?? "");
  const [baris, setBaris] = useState<Baris[]>(
    (initial.units ?? []).map((u) => ({
      nama: u.nama,
      faktor: String(u.faktor),
      hargaJual: String(u.hargaJual),
    })),
  );
  const [defaultNama, setDefaultNama] = useState(initial.defaultNama || DASAR);

  const wajibResepGolongan = (WAJIB_RESEP as string[]).includes(golongan);

  const unitsJson = JSON.stringify(
    baris
      .filter((b) => b.nama.trim() !== "")
      .map((b) => ({ nama: b.nama.trim(), faktor: Number(b.faktor) || 0, hargaJual: Number(b.hargaJual) || 0 })),
  );
  const defaultTerkirim = defaultNama === DASAR ? satuanDasar : defaultNama;

  return (
    <form action={action} className="card max-w-3xl">
      <input type="hidden" name="unitsJson" value={unitsJson} />
      <input type="hidden" name="defaultNama" value={defaultTerkirim} />
      <input type="hidden" name="requiresResep" value={String(requiresResep)} />
      <input type="hidden" name="bahanRacikan" value={String(bahanRacikan)} />
      <input type="hidden" name="jualBebas" value={String(jualBebas)} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="p-5">
        <h2 className="text-sm font-semibold">Data utama</h2>
        <p className="mt-0.5 text-xs text-muted">Nama, klasifikasi, dan identitas item.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nama" className="block text-sm font-medium text-ink-2">
              Nama item <span className="text-danger">*</span>
            </label>
            <input id="nama" name="nama" required defaultValue={initial.nama} placeholder="Paracetamol 500 mg" className="input mt-1.5" />
          </div>
          <div>
            <label htmlFor="kode" className="block text-sm font-medium text-ink-2">
              Kode internal
            </label>
            <input id="kode" name="kode" defaultValue={initial.kode} placeholder="otomatis (OBT-0001)" className="input mt-1.5 font-mono text-[13px]" />
          </div>
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-ink-2">
              Barcode pabrik
            </label>
            <input id="barcode" name="barcode" defaultValue={initial.barcode} placeholder="899… (boleh kosong)" className="input mt-1.5 font-mono text-[13px]" />
          </div>
          <div>
            <label htmlFor="golongan" className="block text-sm font-medium text-ink-2">
              Golongan <span className="text-danger">*</span>
            </label>
            <select
              id="golongan"
              name="golongan"
              value={golongan}
              onChange={(e) => {
                const g = e.target.value as Golongan;
                setGolongan(g);
                if ((WAJIB_RESEP as string[]).includes(g)) setRequiresResep(true);
              }}
              className="input mt-1.5"
            >
              {Object.entries(GOLONGAN_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            {wajibResepGolongan && (
              <p className="mt-1.5 text-xs text-warn">Golongan ini wajib resep — penjualan akan ditolak tanpa resep tercatat.</p>
            )}
          </div>
          <div>
            <label htmlFor="kategori" className="block text-sm font-medium text-ink-2">
              Kategori
            </label>
            <input id="kategori" name="kategori" defaultValue={initial.kategori} placeholder="Analgesik, Antibiotik, Alkes…" className="input mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pabrik" className="block text-sm font-medium text-ink-2">
              Pabrik / merek
            </label>
            <input id="pabrik" name="pabrik" defaultValue={initial.pabrik} placeholder="Kimia Farma, Sanbe…" className="input mt-1.5" />
          </div>
        </div>
      </div>

      <div className="border-t border-line p-5">
        <h2 className="text-sm font-semibold">Satuan &amp; harga jual</h2>
        <p className="mt-0.5 text-xs text-muted">
          Stok selalu dicatat dalam satuan dasar. Satuan lain hanya cara jual — faktor = berapa satuan dasar per satuan itu.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="satuanDasar" className="block text-sm font-medium text-ink-2">
              Satuan dasar <span className="text-danger">*</span>
            </label>
            <input
              id="satuanDasar"
              name="satuanDasar"
              required
              list="saran-satuan"
              value={satuanDasar}
              onChange={(e) => setSatuanDasar(e.target.value)}
              placeholder="tablet"
              className="input mt-1.5"
            />
            <datalist id="saran-satuan">
              {SATUAN_DASAR_SARAN.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="hargaJualDasar" className="block text-sm font-medium text-ink-2">
              Harga jual per {satuanDasar || "satuan dasar"} <span className="text-danger">*</span>
            </label>
            <input
              id="hargaJualDasar"
              name="hargaJualDasar"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={initial.hargaJualDasar ?? ""}
              placeholder="500"
              className="input mt-1.5 tabular-nums"
            />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink-2">Satuan lain</legend>
          <div className="mt-2 space-y-2">
            <div className="hidden gap-2 px-1 text-xs font-medium text-muted sm:grid sm:grid-cols-[1fr_96px_140px_44px_32px]">
              <span>Nama satuan</span>
              <span>Faktor</span>
              <span>Harga jual (Rp)</span>
              <span>Default</span>
              <span />
            </div>

            <label className="flex items-center gap-2 rounded-lg bg-inset px-3 py-2 text-sm sm:grid sm:grid-cols-[1fr_96px_140px_44px_32px] sm:rounded-lg">
              <span className="font-medium">{satuanDasar || "satuan dasar"}<span className="ml-1.5 text-xs text-muted">faktor 1</span></span>
              <span className="hidden text-muted sm:block">1</span>
              <span className="hidden text-muted sm:block">harga dasar</span>
              <input
                type="radio"
                name="__default_radio"
                checked={defaultNama === DASAR}
                onChange={() => setDefaultNama(DASAR)}
                className="size-4 accent-[var(--brand)]"
                aria-label={`Jadikan ${satuanDasar || "satuan dasar"} sebagai default`}
              />
              <span />
            </label>

            {baris.map((b, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_96px_140px_44px_32px] sm:items-center sm:border-0 sm:p-0">
                <input
                  aria-label={`Nama satuan ${i + 1}`}
                  value={b.nama}
                  onChange={(e) => setBaris(baris.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))}
                  placeholder="Strip"
                  className="input py-1.5"
                />
                <input
                  aria-label={`Faktor satuan ${i + 1}`}
                  type="number"
                  min={1}
                  step={1}
                  value={b.faktor}
                  onChange={(e) => setBaris(baris.map((x, j) => (j === i ? { ...x, faktor: e.target.value } : x)))}
                  placeholder="10"
                  className="input py-1.5 tabular-nums"
                />
                <input
                  aria-label={`Harga jual satuan ${i + 1}`}
                  type="number"
                  min={0}
                  step={100}
                  value={b.hargaJual}
                  onChange={(e) => setBaris(baris.map((x, j) => (j === i ? { ...x, hargaJual: e.target.value } : x)))}
                  placeholder="5000"
                  className="input py-1.5 tabular-nums"
                />
                <input
                  type="radio"
                  name="__default_radio"
                  checked={defaultNama === b.nama && b.nama.trim() !== ""}
                  onChange={() => b.nama.trim() !== "" && setDefaultNama(b.nama)}
                  className="size-4 accent-[var(--brand)]"
                  aria-label={`Jadikan ${b.nama || "satuan ini"} sebagai default`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setBaris(baris.filter((_, j) => j !== i));
                    if (defaultNama === b.nama) setDefaultNama(DASAR);
                  }}
                  aria-label={`Hapus satuan ${b.nama || i + 1}`}
                  className="justify-self-end rounded-md p-1.5 text-muted outline-none transition-colors duration-150 hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setBaris([...baris, { nama: "", faktor: "", hargaJual: "" }])}
            className="btn btn-outline mt-3 px-3 py-1.5 text-xs"
          >
            + Tambah satuan
          </button>
          <p className="mt-2 text-xs text-muted">Contoh: 1 Strip = 10 tablet, 1 Box = 100 tablet. Satuan default dipakai otomatis di kasir.</p>
        </fieldset>
      </div>

      <div className="border-t border-line p-5">
        <h2 className="text-sm font-semibold">Pengaturan apotek</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stokMinDasar" className="block text-sm font-medium text-ink-2">
              Stok minimum (satuan dasar)
            </label>
            <input
              id="stokMinDasar"
              name="stokMinDasar"
              type="number"
              min={0}
              step={1}
              defaultValue={initial.stokMinDasar ?? 0}
              className="input mt-1.5 tabular-nums"
            />
            <p className="mt-1.5 text-xs text-muted">Muncul di dashboard sebagai &ldquo;stok menipis&rdquo; kalau di bawah angka ini.</p>
          </div>
          <div className="space-y-2.5 pt-1">
            <Check label="Wajib resep dokter" checked={requiresResep} onChange={setRequiresResep} />
            <Check label="Boleh jadi bahan racikan" checked={bahanRacikan} onChange={setBahanRacikan} />
            <Check label="Boleh dijual bebas" checked={jualBebas} onChange={setJualBebas} />
          </div>
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="mx-5 mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-line bg-inset/50 px-5 py-3.5">
        <Link href={initial.id ? `/obat/${initial.id}` : "/obat"} className="btn btn-outline">
          Batal
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Menyimpan…" : "Simpan item"}
        </button>
      </div>
    </form>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}
