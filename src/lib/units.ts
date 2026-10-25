/**
 * Multi-satuan. Stok di DB SELALU dalam satuan dasar (tablet/pcs/ml).
 * Modul ini satu-satunya tempat yang boleh mengubah angka itu.
 *
 * Aturan mati:
 *  - faktor satuan dasar = 1
 *  - faktor integer, tidak boleh 0 / negatif
 *  - qty jual integer dalam satuan jual (tidak jual 0.5 strip)
 */

export type Satuan = {
  id?: string;
  nama: string;
  faktor: number;
  hargaJual: number;
  isDefault?: boolean;
};

export function validasiSatuan(units: Satuan[]): void {
  if (units.length === 0) throw new Error("Item harus punya minimal 1 satuan");
  const dasar = units.filter((u) => u.faktor === 1);
  if (dasar.length !== 1) throw new Error("Harus ada tepat 1 satuan dengan faktor = 1 (satuan dasar)");
  const nama = new Set<string>();
  for (const u of units) {
    if (!Number.isInteger(u.faktor) || u.faktor < 1) throw new Error(`Faktor satuan "${u.nama}" harus bilangan bulat >= 1`);
    if (u.hargaJual < 0 || !Number.isInteger(u.hargaJual)) throw new Error(`Harga satuan "${u.nama}" harus rupiah utuh`);
    const key = u.nama.trim().toLowerCase();
    if (nama.has(key)) throw new Error(`Nama satuan "${u.nama}" dobel`);
    nama.add(key);
  }
  if (units.filter((u) => u.isDefault).length > 1) throw new Error("Hanya boleh 1 satuan default");
}

/** qty dalam satuan jual -> satuan dasar */
export function toBase(qtyUnit: number, faktor: number): number {
  if (!Number.isInteger(qtyUnit)) throw new Error("Qty jual harus bilangan bulat");
  if (!Number.isInteger(faktor) || faktor < 1) throw new Error("Faktor tidak valid");
  return qtyUnit * faktor;
}

/** satuan dasar -> qty dalam satuan jual; null jika tidak habis dibagi */
export function fromBase(qtyBase: number, faktor: number): number | null {
  if (faktor < 1) return null;
  return qtyBase % faktor === 0 ? qtyBase / faktor : null;
}

/**
 * Pecah stok dasar jadi satuan besar -> kecil.
 * 250 tablet, satuan [Box=100, Strip=10, Tablet=1] -> Box 2, Strip 3, Tablet 0
 * Satuan dasar HARUS ikut di array dan jadi penutup (selalu muncul).
 */
export function breakdown(qtyBase: number, units: Satuan[]): { nama: string; qty: number }[] {
  const sorted = [...units].sort((a, b) => b.faktor - a.faktor);
  let sisa = Math.abs(Math.trunc(qtyBase));
  const out: { nama: string; qty: number }[] = [];
  for (const u of sorted) {
    const qty = Math.floor(sisa / u.faktor);
    sisa -= qty * u.faktor;
    // tampilkan satuan besar hanya kalau ada isinya; satuan dasar selalu tampil
    if (qty > 0 || u.faktor === 1) out.push({ nama: u.nama, qty });
  }
  return out;
}

/** "2 Box 3 Strip" — ramah dibaca kasir. Nol di tengah dilewati. */
export function formatStok(qtyBase: number, units: Satuan[]): string {
  const parts = breakdown(qtyBase, units).filter((p, i, arr) => p.qty > 0 || i === arr.length - 1);
  const sign = qtyBase < 0 ? "-" : "";
  return sign + parts.map((p) => `${p.qty} ${p.nama}`).join(" ");
}

/**
 * Harga per satuan dasar dari sebuah satuan jual, untuk laporan laba/rugi.
 * Dibulatkan ke bawah supaya HPP tidak pernah "lebih mahal" dari harga jual.
 */
export function hargaPerDasar(hargaSatuan: number, faktor: number): number {
  return Math.floor(hargaSatuan / faktor);
}

/**
 * Cek harga multi-satuan: Box 100 tab Rp50.000 (500/tab) vs Strip 10 tab Rp6.000 (600/tab).
 * Mengembalikan peringatan bila satuan besar lebih mahal per unit dasar —
 * biasanya salah input, dan pelanggan besar akan komplain.
 */
export function cekHargaBerjenjang(units: Satuan[]): string[] {
  const warns: string[] = [];
  const sorted = [...units].sort((a, b) => b.faktor - a.faktor);
  for (let i = 0; i < sorted.length - 1; i++) {
    const besar = sorted[i];
    const kecil = sorted[i + 1];
    if (hargaPerDasar(besar.hargaJual, besar.faktor) > hargaPerDasar(kecil.hargaJual, kecil.faktor)) {
      warns.push(
        `${besar.nama} lebih mahal per ${kecil.nama === "1" ? "unit" : "unit dasar"} daripada ${kecil.nama}`,
      );
    }
  }
  return warns;
}
