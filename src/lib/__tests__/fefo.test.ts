import { describe, expect, it } from "vitest";
import {
  alokasiFefo,
  bucketExpiry,
  daysUntil,
  hppDariAlokasi,
  isExpired,
  isHampirExpired,
  nilaiBerisiko,
  stokLayakJual,
  stokTercatat,
  type BatchLike,
} from "../fefo";

/** Acuan tetap supaya hasil tidak berubah tergantung jam mesin. */
const NOW = new Date("2026-03-10T08:00:00.000Z");

function batch(over: Partial<BatchLike> & { id: string; expiry: string }): BatchLike {
  return {
    noBatch: `B-${over.id}`,
    qtySisa: 10,
    hargaBeli: 1000,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("alokasiFefo", () => {
  it("mengeluarkan batch yang paling dekat expired, bukan yang paling awal masuk", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "lama", expiry: "2027-01-01", createdAt: "2025-01-01T00:00:00.000Z" }),
        batch({ id: "dekat", expiry: "2026-04-01", createdAt: "2026-02-01T00:00:00.000Z" }),
      ],
      5,
      { now: NOW },
    );

    expect(hasil.allocations).toHaveLength(1);
    expect(hasil.allocations[0]).toMatchObject({ batchId: "dekat", qty: 5 });
    expect(hasil.qtyTerpenuhi).toBe(5);
    expect(hasil.qtyKurang).toBe(0);
  });

  it("memecah satu permintaan ke beberapa batch dan melaporkan kekurangan", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "a", expiry: "2026-04-01", qtySisa: 3 }),
        batch({ id: "b", expiry: "2026-05-01", qtySisa: 4 }),
      ],
      10,
      { now: NOW },
    );

    expect(hasil.allocations.map((a) => [a.batchId, a.qty])).toEqual([
      ["a", 3],
      ["b", 4],
    ]);
    expect(hasil.qtyTerpenuhi).toBe(7);
    expect(hasil.qtyKurang).toBe(3);
  });

  it("melewati batch expired tetapi tetap menghitungnya sebagai stok tidak layak jual", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "mati", expiry: "2026-03-09", qtySisa: 8 }),
        batch({ id: "hidup", expiry: "2026-06-01", qtySisa: 2 }),
      ],
      5,
      { now: NOW },
    );

    expect(hasil.allocations.map((a) => a.batchId)).toEqual(["hidup"]);
    expect(hasil.qtyExpired).toBe(8);
    expect(hasil.qtyKurang).toBe(3);
  });

  it("obat yang expired hari ini masih boleh dijual", () => {
    const hasil = alokasiFefo([batch({ id: "hariini", expiry: "2026-03-10", qtySisa: 4 })], 4, {
      now: NOW,
    });

    expect(hasil.allocations).toHaveLength(1);
    expect(hasil.qtyExpired).toBe(0);
  });

  it("allowExpired memakai batch sellable dulu, lalu yang expired", () => {
    const batches = [
      batch({ id: "mati", expiry: "2026-01-01", qtySisa: 5 }),
      batch({ id: "hidup", expiry: "2026-08-01", qtySisa: 2 }),
    ];

    const normal = alokasiFefo(batches, 6, { now: NOW });
    expect(normal.allocations.map((a) => a.batchId)).toEqual(["hidup"]);

    const darurat = alokasiFefo(batches, 6, { now: NOW, allowExpired: true });
    expect(darurat.allocations.map((a) => a.batchId)).toEqual(["hidup", "mati"]);
    expect(darurat.qtyTerpenuhi).toBe(6);
  });

  it("preferBatchId memaksa batch tertentu lebih dulu tanpa mengabaikan sisanya", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "dekat", expiry: "2026-04-01", qtySisa: 1 }),
        batch({ id: "jauh", expiry: "2027-01-01", qtySisa: 2 }),
      ],
      3,
      { now: NOW, preferBatchId: "jauh" },
    );

    expect(hasil.allocations.map((a) => a.batchId)).toEqual(["jauh", "dekat"]);
  });

  it("permintaan nol atau negatif tidak menghasilkan alokasi", () => {
    const batches = [batch({ id: "a", expiry: "2026-06-01" })];

    expect(alokasiFefo(batches, 0, { now: NOW })).toMatchObject({
      allocations: [],
      qtyTerpenuhi: 0,
      qtyKurang: 0,
    });
    expect(alokasiFefo(batches, -3, { now: NOW }).qtyKurang).toBe(0);
  });

  it("mengabaikan batch dengan sisa nol atau negatif", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "kosong", expiry: "2026-04-01", qtySisa: 0 }),
        batch({ id: "minus", expiry: "2026-04-02", qtySisa: -2 }),
        batch({ id: "ada", expiry: "2026-04-03", qtySisa: 1 }),
      ],
      1,
      { now: NOW },
    );

    expect(hasil.allocations.map((a) => a.batchId)).toEqual(["ada"]);
  });

  it("mengurutkan deterministik saat tanggal dan waktu masuk sama", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "b", expiry: "2026-05-01", qtySisa: 1 }),
        batch({ id: "a", expiry: "2026-05-01", qtySisa: 1 }),
      ],
      2,
      { now: NOW },
    );

    expect(hasil.allocations.map((a) => a.batchId)).toEqual(["a", "b"]);
  });
});

describe("tanggal kedaluwarsa", () => {
  it("daysUntil menghitung per hari, bukan per jam", () => {
    expect(daysUntil("2026-03-11", NOW)).toBe(1);
    expect(daysUntil("2026-03-09", NOW)).toBe(-1);
    expect(daysUntil("2026-03-10T23:59:00.000Z", NOW)).toBe(0);
  });

  it("isExpired dan isHampirExpired memakai ambang hari", () => {
    expect(isExpired("2026-03-09", NOW)).toBe(true);
    expect(isExpired("2026-03-10", NOW)).toBe(false);
    expect(isHampirExpired("2026-04-05", NOW)).toBe(true);
    expect(isHampirExpired("2026-04-05", NOW, 10)).toBe(false);
    expect(isHampirExpired("2026-03-01", NOW)).toBe(false);
  });
});

describe("laporan stok", () => {
  const batches = [
    batch({ id: "exp", expiry: "2026-03-01", qtySisa: 5, hargaBeli: 2000 }),
    batch({ id: "dekat", expiry: "2026-03-25", qtySisa: 2, hargaBeli: 1500 }),
    batch({ id: "sedang", expiry: "2026-05-01", qtySisa: 3, hargaBeli: 1500 }),
    batch({ id: "jauh", expiry: "2026-09-01", qtySisa: 4, hargaBeli: 1500 }),
  ];

  it("stok layak jual membuang batch expired, stok tercatat tidak", () => {
    expect(stokLayakJual(batches, NOW)).toBe(9);
    expect(stokTercatat(batches)).toBe(14);
  });

  it("bucketExpiry mengelompokkan 30/60/90 hari", () => {
    expect(bucketExpiry(batches, NOW)).toEqual({ 30: 2, 60: 3, 90: 0 });
  });

  it("nilaiBerisiko hanya menjumlah qty dikali harga beli batch yang berisiko", () => {
    expect(nilaiBerisiko(batches, 30, NOW)).toBe(3000);
  });

  it("hpp memakai harga beli batch yang benar-benar keluar, bukan rata-rata", () => {
    const hasil = alokasiFefo(
      [
        batch({ id: "murah", expiry: "2026-04-01", qtySisa: 2, hargaBeli: 1000 }),
        batch({ id: "mahal", expiry: "2026-05-01", qtySisa: 2, hargaBeli: 4000 }),
      ],
      3,
      { now: NOW },
    );

    expect(hppDariAlokasi(hasil.allocations)).toBe(2 * 1000 + 1 * 4000);
  });
});
