import { describe, expect, it } from "vitest";
import {
  computeTotals,
  formatAngka,
  formatRupiah,
  hitungKembali,
  lineSubtotal,
  parseQtyMilli,
  parseUang,
  saranBayar,
  uangKurang,
} from "../money";

describe("parseUang", () => {
  it("membaca rupiah dengan pemisah ribuan dan simbol", () => {
    expect(parseUang("Rp1.500")).toBe(1500);
    expect(parseUang("1.500.000")).toBe(1_500_000);
    expect(parseUang(" 12 000 ")).toBe(12_000);
    expect(parseUang(2500)).toBe(2500);
  });

  it("input kosong atau sampah menjadi nol, bukan NaN", () => {
    expect(parseUang(null)).toBe(0);
    expect(parseUang(undefined)).toBe(0);
    expect(parseUang("")).toBe(0);
    expect(parseUang("abc")).toBe(0);
  });

  it("membulatkan pecahan agar jalur uang tetap integer", () => {
    expect(parseUang("1500.7")).toBe(15007);
    expect(parseUang(1499.6)).toBe(1500);
    expect(Number.isInteger(parseUang("2.500,4"))).toBe(true);
  });
});

describe("parseQtyMilli", () => {
  it("menerima koma desimal dan menyimpan tiga digit presisi", () => {
    expect(parseQtyMilli("2,5")).toBe(2500);
    expect(parseQtyMilli("0,125")).toBe(125);
    expect(parseQtyMilli(1.5)).toBe(1500);
  });

  it("mengembalikan nol untuk input tidak valid", () => {
    expect(parseQtyMilli("")).toBe(0);
    expect(parseQtyMilli(null)).toBe(0);
    expect(parseQtyMilli("obat")).toBe(0);
  });
});

describe("baris dan total nota", () => {
  it("lineSubtotal mengalikan harga dengan qty lalu memotong diskon", () => {
    expect(lineSubtotal({ hargaSatuan: 1500, qtyUnit: 3 })).toBe(4500);
    expect(lineSubtotal({ hargaSatuan: 1500, qtyUnit: 3, diskon: 500 })).toBe(4000);
  });

  it("diskon baris tidak boleh melebihi harga baris", () => {
    expect(lineSubtotal({ hargaSatuan: 1000, qtyUnit: 1, diskon: 5000 })).toBe(0);
    expect(lineSubtotal({ hargaSatuan: 1000, qtyUnit: 1, diskon: -200 })).toBe(1000);
  });

  it("computeTotals menjumlah baris, memotong diskon nota, dan membatasi di subtotal", () => {
    const lines = [
      { hargaSatuan: 2000, qtyUnit: 2 },
      { hargaSatuan: 7500, qtyUnit: 1, diskon: 500 },
    ];

    expect(computeTotals(lines)).toEqual({ subtotal: 11000, diskon: 0, total: 11000 });
    expect(computeTotals(lines, 1000)).toEqual({ subtotal: 11000, diskon: 1000, total: 10000 });
    expect(computeTotals(lines, 99_999)).toEqual({ subtotal: 11000, diskon: 11000, total: 0 });
  });

  it("pembulatan hanya terjadi kalau diminta eksplisit", () => {
    expect(computeTotals([{ hargaSatuan: 1234, qtyUnit: 1 }]).total).toBe(1234);
    expect(computeTotals([{ hargaSatuan: 1234, qtyUnit: 1 }], 0, 100).total).toBe(1200);
    expect(computeTotals([{ hargaSatuan: 1250, qtyUnit: 1 }], 0, 100).total).toBe(1300);
  });

  it("nota kosong tetap menghasilkan nol yang konsisten", () => {
    expect(computeTotals([])).toEqual({ subtotal: 0, diskon: 0, total: 0 });
  });
});

describe("pembayaran", () => {
  it("kembalian tidak pernah negatif", () => {
    expect(hitungKembali(50_000, 43_500)).toBe(6500);
    expect(hitungKembali(10_000, 43_500)).toBe(0);
    expect(hitungKembali(43_500, 43_500)).toBe(0);
  });

  it("uangKurang membandingkan nilai yang sudah dibulatkan", () => {
    expect(uangKurang(43_499, 43_500)).toBe(true);
    expect(uangKurang(43_500, 43_500)).toBe(false);
  });

  it("saranBayar mengurut naik, memuat uang pas, dan dibatasi lima pilihan", () => {
    const saran = saranBayar(43_500);

    expect(saran[0]).toBe(43_500);
    expect(saran).toContain(45_000);
    expect(saran).toContain(50_000);
    expect(saran.length).toBeLessThanOrEqual(5);
    expect([...saran].sort((a, b) => a - b)).toEqual(saran);
    expect(new Set(saran).size).toBe(saran.length);
  });

  it("saranBayar tidak menyarankan nominal di bawah total", () => {
    for (const total of [1, 999, 12_345, 250_000]) {
      for (const nominal of saranBayar(total)) {
        expect(nominal).toBeGreaterThanOrEqual(total);
      }
    }
    expect(saranBayar(0)).toEqual([]);
  });
});

describe("format tampilan", () => {
  it("formatRupiah memakai pemisah Indonesia dan tanda minus di depan", () => {
    expect(formatRupiah(1500)).toBe("Rp1.500");
    expect(formatRupiah(1_500_000)).toBe("Rp1.500.000");
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(-2500)).toBe("-Rp2.500");
  });

  it("formatAngka membulatkan tanpa simbol mata uang", () => {
    expect(formatAngka(1_500_000)).toBe("1.500.000");
    expect(formatAngka(1499.6)).toBe("1.500");
  });
});
