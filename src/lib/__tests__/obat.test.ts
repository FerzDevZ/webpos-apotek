import { describe, expect, it } from "vitest";
import { susunUnits } from "../obat";

describe("susunUnits", () => {
  it("rakit base + baris tambahan + default di strip", () => {
    const hasil = susunUnits("tablet", 500, [{ nama: "Strip", faktor: 10, hargaJual: 4800 }], "Strip");
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.data).toHaveLength(2);
    expect(hasil.data.find((u) => u.nama === "tablet")).toMatchObject({ faktor: 1, hargaJual: 500 });
    expect(hasil.data.find((u) => u.nama === "Strip")).toMatchObject({ faktor: 10, isDefault: true });
  });

  it("default kosong jatuh ke satuan dasar", () => {
    const hasil = susunUnits("botol", 23000, [], "");
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.data[0].isDefault).toBe(true);
  });

  it("nama satuan dobel (beda kapital) ditolak", () => {
    const hasil = susunUnits("tablet", 500, [{ nama: "Strip", faktor: 10, hargaJual: 4800 }, { nama: "STRIP", faktor: 100, hargaJual: 45000 }], "Strip");
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.error).toMatch(/dobel/i);
  });

  it("faktor tidak bulat ditolak", () => {
    const hasil = susunUnits("tablet", 500, [{ nama: "Strip", faktor: 1.5, hargaJual: 4800 }], "Strip");
    expect(hasil.ok).toBe(false);
  });

  it("default yang tidak ada di daftar ditolak", () => {
    const hasil = susunUnits("tablet", 500, [{ nama: "Strip", faktor: 10, hargaJual: 4800 }], "Box");
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.error).toMatch(/default/i);
  });

  it("satuan dasar kosong ditolak", () => {
    expect(susunUnits("  ", 500, [], "").ok).toBe(false);
  });
});
