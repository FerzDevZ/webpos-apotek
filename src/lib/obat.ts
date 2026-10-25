/**
 * Helper domain untuk master obat (murni, tanpa DB — gampang dites).
 * Aturan validasi satuan sendiri ada di units.ts (validasiSatuan); modul ini
 * cuma merakit input form menjadi daftar satuan siap simpan.
 */
import { validasiSatuan, cekHargaBerjenjang, type Satuan } from "./units";

export type BarisSatuanInput = {
  nama: string;
  faktor: number;
  hargaJual: number;
};

export type Hasil<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Rakit satuan final: baris dasar (faktor 1, harga = hargaJualDasar) + baris
 * tambahan dari form, lalu tentukan satuan default.
 * defaultNama: nama satuan yang jadi pilihan bawaan di kasir — harus cocok
 * dengan salah satu satuan (case-insensitive). Kosong = satuan dasar.
 */
export function susunUnits(
  satuanDasar: string,
  hargaJualDasar: number,
  baris: BarisSatuanInput[],
  defaultNama: string,
): Hasil<Satuan[]> {
  const dasar = satuanDasar.trim();
  if (!dasar) return { ok: false, error: "Satuan dasar wajib diisi" };

  const units: Satuan[] = [{ nama: dasar, faktor: 1, hargaJual: hargaJualDasar }];
  for (const b of baris) {
    const nama = b.nama.trim();
    if (!nama) return { ok: false, error: "Ada baris satuan tanpa nama" };
    units.push({ nama, faktor: b.faktor, hargaJual: b.hargaJual });
  }

  const target = (defaultNama || dasar).trim().toLowerCase();
  const dipilih = units.find((u) => u.nama.toLowerCase() === target);
  if (!dipilih) return { ok: false, error: `Satuan default "${defaultNama}" tidak ada di daftar` };
  dipilih.isDefault = true;

  try {
    validasiSatuan(units);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Satuan tidak valid" };
  }
  return { ok: true, data: units };
}

/** Peringatan harga (bukan error): satuan besar lebih mahal per unit dasar. */
export function peringatanHarga(units: Satuan[]): string[] {
  return cekHargaBerjenjang(units);
}
