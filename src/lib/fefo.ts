/**
 * FEFO — First Expiry First Out. Jantung apotek.
 *
 * Kenapa bukan FIFO? Karena obat tidak "basi karena tua", tapi karena tanggal.
 * Batch yang masuk belakangan tapi expired lebih dulu HARUS keluar lebih dulu.
 * Kalau logika ini salah, apotek menanggung kerugian nyata (obat expired di rak).
 *
 * Modul ini murni (tanpa DB) supaya bisa dites cepat dan dipakai di server & client.
 */

export type BatchLike = {
  id: string;
  noBatch: string;
  expiry: Date | string;
  qtySisa: number;
  hargaBeli: number;
  createdAt?: Date | string;
};

export type Allocation = {
  batchId: string;
  noBatch: string;
  expiry: Date;
  qty: number;
  hargaBeli: number;
};

export type AlokasiHasil = {
  allocations: Allocation[];
  qtyTerpenuhi: number;
  qtyKurang: number;
  /** stok yang terlihat tersedia tapi TIDAK boleh dijual (expired) */
  qtyExpired: number;
  /** stok yang boleh dijual tapi hampir expired (< ambang hari) */
  qtyHampirExpired: number;
};

export const DEFAULT_ED_DAYS = 30;

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysUntil(expiry: Date | string, now: Date = new Date()): number {
  const e = startOfDay(toDate(expiry)).getTime();
  const n = startOfDay(now).getTime();
  return Math.round((e - n) / 86_400_000);
}

/** Obat yang tanggalnya hari ini masih boleh dijual (aturan umum farmasi). Lewat 1 hari = tidak. */
export function isExpired(expiry: Date | string, now: Date = new Date()): boolean {
  return daysUntil(expiry, now) < 0;
}

export function isHampirExpired(expiry: Date | string, now: Date = new Date(), ambangHari = DEFAULT_ED_DAYS): boolean {
  const d = daysUntil(expiry, now);
  return d >= 0 && d <= ambangHari;
}

/** Batas tanggal: semua yang expiry < tanggal ini dianggap tidak layak jual. */
export function batasLayakJual(now: Date = new Date()): Date {
  // hari ini 00:00 → batch dengan expiry >= hari ini boleh dijual
  return startOfDay(now);
}

export type FefoOptions = {
  /** izin menjual obat expired (default TIDAK; hanya untuk koreksi/administrasi) */
  allowExpired?: boolean;
  /** batch yang dipaksa dipakai lebih dulu (override manual oleh apoteker) */
  preferBatchId?: string;
  /** tanggal acuan, untuk tes */
  now?: Date;
};

/**
 * Alokasi qty (satuan dasar) ke batch dengan urutan FEFO.
 *
 * Urutan: expiry terdekat dulu → kalau expiry sama, yang masuk lebih dulu (createdAt) →
 * kalau masih sama, id (deterministik, supaya tes stabil).
 *
 * qty harus > 0. Batch dengan qtySisa <= 0 diabaikan.
 * Batch expired DILEWATI kecuali allowExpired = true.
 */
export function alokasiFefo(batches: BatchLike[], qtyDibutuhkan: number, opts: FefoOptions = {}): AlokasiHasil {
  const now = opts.now ?? new Date();
  const qty = Math.trunc(qtyDibutuhkan);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { allocations: [], qtyTerpenuhi: 0, qtyKurang: Math.max(0, qty || 0), qtyExpired: 0, qtyHampirExpired: 0 };
  }

  const batas = startOfDay(now).getTime();
  let qtyExpired = 0;
  let qtyHampirExpired = 0;
  const layak: BatchLike[] = [];
  const expired: BatchLike[] = [];

  for (const b of batches) {
    if (b.qtySisa <= 0) continue;
    const exp = toDate(b.expiry).getTime();
    if (exp < batas) {
      qtyExpired += b.qtySisa;
      expired.push(b);
    } else {
      layak.push(b);
      if (isHampirExpired(b.expiry, now)) qtyHampirExpired += b.qtySisa;
    }
  }

  const sortFn = (a: BatchLike, b: BatchLike) => {
    const ea = toDate(a.expiry).getTime();
    const eb = toDate(b.expiry).getTime();
    if (ea !== eb) return ea - eb;
    const ca = a.createdAt ? toDate(a.createdAt).getTime() : 0;
    const cb = b.createdAt ? toDate(b.createdAt).getTime() : 0;
    if (ca !== cb) return ca - cb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };

  layak.sort(sortFn);
  expired.sort(sortFn);

  let pool = layak;
  if (opts.preferBatchId) {
    const idx = pool.findIndex((b) => b.id === opts.preferBatchId);
    if (idx >= 0) {
      const chosen = pool[idx];
      pool = [chosen, ...pool.filter((_, i) => i !== idx)];
    }
  }
  if (opts.allowExpired) pool = [...pool, ...expired];

  const allocations: Allocation[] = [];
  let sisa = qty;
  for (const b of pool) {
    if (sisa <= 0) break;
    const ambil = Math.min(sisa, b.qtySisa);
    if (ambil <= 0) continue;
    allocations.push({
      batchId: b.id,
      noBatch: b.noBatch,
      expiry: toDate(b.expiry),
      qty: ambil,
      hargaBeli: b.hargaBeli,
    });
    sisa -= ambil;
  }

  return {
    allocations,
    qtyTerpenuhi: qty - sisa,
    qtyKurang: sisa,
    qtyExpired,
    qtyHampirExpired,
  };
}

/** Total stok layak jual (bukan sekadar SUM(qtySisa) yang menipu karena ikut menghitung expired). */
export function stokLayakJual(batches: BatchLike[], now: Date = new Date()): number {
  const batas = startOfDay(now).getTime();
  return batches.reduce((a, b) => (b.qtySisa > 0 && toDate(b.expiry).getTime() >= batas ? a + b.qtySisa : a), 0);
}

/** Total stok tercatat, termasuk yang expired (untuk rekonsiliasi & laporan kerugian). */
export function stokTercatat(batches: BatchLike[]): number {
  return batches.reduce((a, b) => a + Math.max(0, b.qtySisa), 0);
}

export type Bucket = 30 | 60 | 90;

/** Kelompokkan batch hampir expired ke bucket laporan. */
export function bucketExpiry(batches: BatchLike[], now: Date = new Date()): Record<Bucket, number> {
  const out: Record<Bucket, number> = { 30: 0, 60: 0, 90: 0 };
  for (const b of batches) {
    if (b.qtySisa <= 0) continue;
    const d = daysUntil(b.expiry, now);
    if (d < 0) continue;
    if (d <= 30) out[30] += b.qtySisa;
    else if (d <= 60) out[60] += b.qtySisa;
    else if (d <= 90) out[90] += b.qtySisa;
  }
  return out;
}

/** Nilai rupiah stok yang berisiko expired dalam N hari (untuk dashboard kerugian). */
export function nilaiBerisiko(batches: BatchLike[], hari: number, now: Date = new Date()): number {
  return batches.reduce((a, b) => {
    if (b.qtySisa <= 0) return a;
    const d = daysUntil(b.expiry, now);
    return d >= 0 && d <= hari ? a + b.qtySisa * b.hargaBeli : a;
  }, 0);
}

/**
 * HPP baris penjualan = jumlah (qty batch × hargaBeli batch).
 * Kalau harga beli berbeda antar batch, HPP harus ikut batch yang benar-benar keluar.
 * Inilah alasan `sale_items.batchId` tidak boleh null.
 */
export function hppDariAlokasi(allocations: Allocation[]): number {
  return allocations.reduce((a, x) => a + x.qty * x.hargaBeli, 0);
}
