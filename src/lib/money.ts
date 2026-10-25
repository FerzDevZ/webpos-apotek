/**
 * Uang: SEMUA nilai rupiah adalah integer (rupiah utuh).
 * Tidak ada float di jalur uang. Tidak ada desimal. Bukan kebetulan —
 * ini mencegah bug klasik "total struk beda 1 rupiah dari jumlah item".
 */

/** "Rp1.500" */
export function formatRupiah(n: number): string {
  const neg = n < 0;
  const s = Math.abs(Math.round(n)).toLocaleString("id-ID");
  return `${neg ? "-" : ""}Rp${s}`;
}

/** "1.500.000" (tanpa Rp, untuk tabel) */
export function formatAngka(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

/**
 * Baca input uang dari kasir. Menerima "1.500", "1500", "1,5jt"? -> tidak.
 * Hanya digit dan pemisah ribuan; sisanya dibuang.
 */
export function parseUang(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : 0;
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

/** Baca qty desimal kecil (untuk bahan racikan: "2,5" tablet) */
export function parseQtyMilli(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  const s = typeof input === "number" ? String(input) : input;
  const clean = s.replace(",", ".").replace(/[^\d.]/g, "");
  if (!clean) return 0;
  const v = Number.parseFloat(clean);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 1000);
}

export type LineInput = {
  /** harga per satuan jual */
  hargaSatuan: number;
  /** qty dalam satuan jual */
  qtyUnit: number;
  /** diskon dalam rupiah untuk baris ini */
  diskon?: number;
};

export function lineSubtotal(line: LineInput): number {
  const gross = Math.round(line.hargaSatuan) * Math.round(line.qtyUnit);
  const disc = Math.min(Math.max(line.diskon ?? 0, 0), gross);
  return gross - disc;
}

export type Totals = {
  subtotal: number;
  diskon: number;
  total: number;
};

/**
 * Hitung total nota.
 * - diskonNota dipotong setelah subtotal.
 * - pembulatanKe (mis. 100) membulatkan total ke bawah? TIDAK: ke terdekat, tapi
 *   hanya kalau diminta eksplisit. Default tidak membulatkan apa pun.
 */
export function computeTotals(
  lines: LineInput[],
  diskonNota = 0,
  pembulatanKe = 0,
): Totals {
  const subtotal = lines.reduce((a, l) => a + lineSubtotal(l), 0);
  const disc = Math.min(Math.max(diskonNota, 0), subtotal);
  let total = subtotal - disc;
  if (pembulatanKe > 0) total = Math.round(total / pembulatanKe) * pembulatanKe;
  return { subtotal, diskon: disc, total };
}

/** Kembalian tidak pernah negatif. */
export function hitungKembali(bayar: number, total: number): number {
  return Math.max(0, Math.round(bayar) - Math.round(total));
}

/** Uang tunai kurang? */
export function uangKurang(bayar: number, total: number): boolean {
  return Math.round(bayar) < Math.round(total);
}

/** Saran nominal cepat di layar kasir (pembulatan ke atas yang wajar). */
export function saranBayar(total: number): number[] {
  if (total <= 0) return [];
  const set = new Set<number>();
  set.add(total); // uang pas
  const steps = [5_000, 10_000, 20_000, 50_000, 100_000];
  for (const s of steps) {
    const v = Math.ceil(total / s) * s;
    if (v !== total) set.add(v);
  }
  return [...set].sort((a, b) => a - b).slice(0, 5);
}
