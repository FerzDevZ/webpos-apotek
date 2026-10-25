/**
 * Seed awal: satu outlet, tiga user, dua supplier, delapan item contoh
 * (dengan batch & satuan), dan tiga penjualan hari ini supaya dashboard
 * langsung menampilkan angka nyata.
 *
 * Idempoten — aman dijalankan berulang:
 * - user/outlet/supplier/item dilewati kalau sudah ada
 * - penjualan seed ditandai noStruk "SEED-xxxx" dan dibuat sekali saja
 *
 * Jalankan: npm run db:seed  (atau otomatis saat `prisma migrate dev`)
 */
import { PrismaClient } from "@prisma/client";
// Ekstensi .ts wajib: seed dijalankan langsung oleh Node (type stripping), ESM butuh path lengkap.
import { hashPassword } from "../src/lib/password.ts";
import { computeTotals, type LineInput } from "../src/lib/money.ts";

const prisma = new PrismaClient();

const OUTLET_ID = "outlet-utama";

const hari = (n: number) => new Date(Date.now() + n * 86_400_000);

type UnitSeed = { nama: string; faktor: number; hargaJual: number; isDefault?: boolean };
type BatchSeed = { noBatch: string; expiryHari: number; qty: number; hargaBeli: number; supplierId: string };
type ItemSeed = {
  kode: string;
  barcode?: string;
  nama: string;
  kategori?: string;
  pabrik?: string;
  golongan: string;
  satuanDasar: string;
  hargaJualDasar: number;
  stokMinDasar: number;
  requiresResep?: boolean;
  bahanRacikan?: boolean;
  units: UnitSeed[];
  batches: BatchSeed[];
};

const SUPPLIERS = [
  { id: "sup-kf", nama: "PT Kimia Farma (PBF)", telp: "021-555-0001" },
  { id: "sup-enseval", nama: "PT Enseval Putera Megatrading", telp: "021-555-0002" },
];

const ITEMS: ItemSeed[] = [
  {
    kode: "OBT-0001",
    barcode: "8991002101234",
    nama: "Paracetamol 500 mg Tablet",
    kategori: "Analgesik",
    pabrik: "Kimia Farma",
    golongan: "BEBAS",
    satuanDasar: "tablet",
    hargaJualDasar: 500,
    stokMinDasar: 500,
    units: [
      { nama: "tablet", faktor: 1, hargaJual: 500 },
      { nama: "Strip", faktor: 10, hargaJual: 4800, isDefault: true },
      { nama: "Box", faktor: 100, hargaJual: 45000 },
    ],
    batches: [
      // sengaja dekat kadaluarsa — muncul di meter dashboard (≤30 hari)
      { noBatch: "PRC24A", expiryHari: 25, qty: 200, hargaBeli: 180, supplierId: "sup-kf" },
      { noBatch: "PRC24B", expiryHari: 400, qty: 800, hargaBeli: 170, supplierId: "sup-kf" },
    ],
  },
  {
    kode: "OBT-0002",
    barcode: "8992753101234",
    nama: "Amoxicillin 500 mg Kapsul",
    kategori: "Antibiotik",
    pabrik: "Sanbe Farma",
    golongan: "KERAS",
    satuanDasar: "kapsul",
    hargaJualDasar: 1200,
    stokMinDasar: 200,
    requiresResep: true,
    units: [
      { nama: "kapsul", faktor: 1, hargaJual: 1200 },
      { nama: "Strip", faktor: 10, hargaJual: 11500, isDefault: true },
    ],
    batches: [{ noBatch: "AMX24A", expiryHari: 200, qty: 150, hargaBeli: 700, supplierId: "sup-enseval" }],
  },
  {
    kode: "OBT-0003",
    barcode: "8996001601234",
    nama: "OBH Combi 100 ml Sirup",
    kategori: "Batuk & Flu",
    pabrik: "Century Pharma",
    golongan: "BEBAS",
    satuanDasar: "botol",
    hargaJualDasar: 23500,
    stokMinDasar: 12,
    units: [{ nama: "botol", faktor: 1, hargaJual: 23500, isDefault: true }],
    batches: [{ noBatch: "OBH24A", expiryHari: 150, qty: 40, hargaBeli: 17000, supplierId: "sup-enseval" }],
  },
  {
    kode: "OBT-0004",
    barcode: "8992695612340",
    nama: "Promag Tablet",
    kategori: "Obat Lambung",
    pabrik: "Combiphar",
    golongan: "BEBAS_TERBATAS",
    satuanDasar: "tablet",
    hargaJualDasar: 600,
    stokMinDasar: 300,
    units: [
      { nama: "tablet", faktor: 1, hargaJual: 600 },
      { nama: "Strip", faktor: 10, hargaJual: 5500, isDefault: true },
    ],
    batches: [{ noBatch: "PRM24A", expiryHari: 75, qty: 250, hargaBeli: 350, supplierId: "sup-enseval" }],
  },
  {
    kode: "OBT-0005",
    nama: "Vitamin B Complex Tablet",
    kategori: "Vitamin & Suplemen",
    pabrik: "Hovid",
    golongan: "BEBAS",
    satuanDasar: "tablet",
    hargaJualDasar: 300,
    stokMinDasar: 100,
    units: [
      { nama: "tablet", faktor: 1, hargaJual: 300 },
      { nama: "Strip", faktor: 10, hargaJual: 2800, isDefault: true },
    ],
    batches: [{ noBatch: "VIT24A", expiryHari: 55, qty: 300, hargaBeli: 150, supplierId: "sup-kf" }],
  },
  {
    kode: "OBT-0006",
    barcode: "8992775312345",
    nama: "Betadine Antiseptik 15 ml",
    kategori: "Antiseptik",
    pabrik: "Mundipharma",
    golongan: "ALKES",
    satuanDasar: "botol",
    hargaJualDasar: 18000,
    stokMinDasar: 10,
    units: [{ nama: "botol", faktor: 1, hargaJual: 18000, isDefault: true }],
    batches: [{ noBatch: "BTD24A", expiryHari: 300, qty: 25, hargaBeli: 13000, supplierId: "sup-kf" }],
  },
  {
    kode: "OBT-0007",
    nama: "Alkohol 70% 100 ml",
    kategori: "Antiseptik",
    pabrik: "OneMed",
    golongan: "ALKES",
    satuanDasar: "botol",
    hargaJualDasar: 12000,
    stokMinDasar: 10,
    units: [{ nama: "botol", faktor: 1, hargaJual: 12000, isDefault: true }],
    batches: [{ noBatch: "ALK24A", expiryHari: 350, qty: 30, hargaBeli: 8500, supplierId: "sup-kf" }],
  },
  {
    kode: "OBT-0008",
    barcode: "8991389112340",
    nama: "Tolak Angin Cair 15 ml",
    kategori: "Herbal",
    pabrik: "Sido Muncul",
    golongan: "HERBAL",
    satuanDasar: "sachet",
    hargaJualDasar: 2500,
    stokMinDasar: 120,
    units: [
      { nama: "sachet", faktor: 1, hargaJual: 2500 },
      { nama: "Box", faktor: 12, hargaJual: 27000, isDefault: true },
    ],
    batches: [{ noBatch: "TLA24A", expiryHari: 600, qty: 240, hargaBeli: 1900, supplierId: "sup-enseval" }],
  },
];

async function main() {
  await prisma.outlet.upsert({
    where: { id: OUTLET_ID },
    update: {},
    create: {
      id: OUTLET_ID,
      nama: "Apotek Sehat Sentosa",
      alamat: "Jl. Melati No. 12, Kota contoh",
      telp: "0812-0000-0000",
      apoteker: "Apt. Contoh, S.Farm.",
      sia: "SIA/DINKES/2026/001",
      sipa: "SIPA/DINKES/2026/001",
      footer: "Terima kasih — obat diminum sesuai aturan pakai",
    },
  });

  const users = [
    { nama: "Pemilik Apotek", email: "admin@apotek.test", password: "admin123", role: "ADMIN" },
    { nama: "Apt. Contoh, S.Farm.", email: "apoteker@apotek.test", password: "apoteker123", role: "APOTEKER" },
    { nama: "Kasir Satu", email: "kasir@apotek.test", password: "kasir123", role: "KASIR" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { nama: u.nama, role: u.role, outletId: OUTLET_ID, aktif: true },
      create: {
        nama: u.nama,
        email: u.email,
        passwordHash: hashPassword(u.password),
        role: u.role,
        outletId: OUTLET_ID,
      },
    });
  }

  for (const s of SUPPLIERS) {
    const ada = await prisma.supplier.findUnique({ where: { id: s.id }, select: { id: true } });
    if (!ada) await prisma.supplier.create({ data: { id: s.id, nama: s.nama, telp: s.telp } });
  }

  const CUSTOMERS = [
    { id: "cus-sari", nama: "Bu Sari", telp: "0813-1111-2222", tipe: "MEMBER", catatan: "Alergi: amoxicillin (ruam)" },
    { id: "cus-pakdwi", nama: "Pak Dwi", telp: "0813-3333-4444", tipe: "UMUM", catatan: null },
  ];
  for (const c of CUSTOMERS) {
    const ada = await prisma.customer.findUnique({ where: { id: c.id }, select: { id: true } });
    if (!ada) {
      await prisma.customer.create({
        data: { id: c.id, nama: c.nama, telp: c.telp, tipe: c.tipe, catatan: c.catatan },
      });
    }
  }

  // Item + satuan + batch (lewati kalau kode sudah terdaftar)
  for (const it of ITEMS) {
    const ada = await prisma.item.findUnique({ where: { kode: it.kode }, select: { id: true } });
    if (ada) continue;
    await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          kode: it.kode,
          barcode: it.barcode,
          nama: it.nama,
          kategori: it.kategori,
          pabrik: it.pabrik,
          golongan: it.golongan,
          satuanDasar: it.satuanDasar,
          hargaJualDasar: it.hargaJualDasar,
          stokMinDasar: it.stokMinDasar,
          requiresResep: it.requiresResep ?? false,
          bahanRacikan: it.bahanRacikan ?? false,
        },
      });
      await tx.itemUnit.createMany({
        data: it.units.map((u) => ({
          itemId: item.id,
          nama: u.nama,
          faktor: u.faktor,
          hargaJual: u.hargaJual,
          isDefault: u.isDefault ?? false,
        })),
      });
      for (const b of it.batches) {
        const batch = await tx.batch.create({
          data: {
            itemId: item.id,
            supplierId: b.supplierId,
            noBatch: b.noBatch,
            expiry: hari(b.expiryHari),
            qtyAwal: b.qty,
            qtySisa: b.qty,
            hargaBeli: b.hargaBeli,
          },
        });
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            batchId: batch.id,
            qty: b.qty,
            tipe: "PURCHASE",
            refType: "PURCHASE",
            refId: batch.id,
            catatan: "Seed awal",
          },
        });
      }
    });
  }

  // Tiga penjualan hari ini — sekali saja (penanda noStruk SEED-)
  const sudahAdaJualan = await prisma.sale.findFirst({
    where: { noStruk: { startsWith: "SEED-" } },
    select: { id: true },
  });
  if (!sudahAdaJualan) {
    const kasir = await prisma.user.findUnique({ where: { email: "kasir@apotek.test" } });

    const ambil = async (kode: string, namaUnit: string, qtyUnit: number) => {
      const item = await prisma.item.findUnique({
        where: { kode },
        include: { units: true, batches: { where: { qtySisa: { gt: 0 } }, orderBy: { expiry: "asc" } } },
      });
      if (!item) throw new Error(`Item seed ${kode} tidak ditemukan`);
      const unit = item.units.find((u) => u.nama === namaUnit) ?? item.units.find((u) => u.faktor === 1);
      if (!unit) throw new Error(`Satuan ${namaUnit} tidak ada di ${kode}`);
      const qtyDasar = qtyUnit * unit.faktor;
      // FEFO sederhana: ambil dari batch kedaluarsa terdekat yang cukup
      let sisa = qtyDasar;
      const pakai: { batchId: string; qty: number }[] = [];
      for (const b of item.batches) {
        if (sisa <= 0) break;
        const ambilQty = Math.min(sisa, b.qtySisa);
        if (ambilQty > 0) {
          pakai.push({ batchId: b.id, qty: ambilQty });
          sisa -= ambilQty;
        }
      }
      if (sisa > 0) throw new Error(`Stok seed ${kode} kurang ${sisa}`);
      return { item, unit, qtyUnit, qtyDasar, pakai, subtotal: qtyUnit * unit.hargaJual };
    };

    const transaksi: { noStruk: string; metode: string; bayar: number; baris: Awaited<ReturnType<typeof ambil>>[] }[] = [
      {
        noStruk: "SEED-0001",
        metode: "TUNAI",
        bayar: 30000,
        baris: [await ambil("OBT-0001", "Strip", 1), await ambil("OBT-0003", "botol", 1)],
      },
      {
        noStruk: "SEED-0002",
        metode: "QRIS",
        bayar: 7800,
        baris: [await ambil("OBT-0005", "Strip", 1), await ambil("OBT-0008", "sachet", 2)],
      },
      {
        noStruk: "SEED-0003",
        metode: "DEBIT",
        bayar: 18000,
        baris: [await ambil("OBT-0006", "botol", 1)],
      },
    ];

    for (const trx of transaksi) {
      const lines: LineInput[] = trx.baris.map((b) => ({ hargaSatuan: b.subtotal / b.qtyUnit, qtyUnit: b.qtyUnit }));
      const totals = computeTotals(lines);
      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            noStruk: trx.noStruk,
            outletId: OUTLET_ID,
            kasirId: kasir?.id,
            subtotal: totals.subtotal,
            diskon: totals.diskon,
            total: totals.total,
            bayar: trx.bayar,
            kembali: Math.max(0, trx.bayar - totals.total),
            metodeBayar: trx.metode,
            status: "PAID",
          },
        });
        for (const b of trx.baris) {
          for (const p of b.pakai) {
            await tx.saleItem.create({
              data: {
                saleId: sale.id,
                itemId: b.item.id,
                batchId: p.batchId,
                unitId: b.unit.id,
                qtyUnit: b.qtyUnit,
                faktor: b.unit.faktor,
                qtyDasar: b.qtyDasar,
                hargaSatuan: b.unit.hargaJual,
                subtotal: b.subtotal,
                namaSnapshot: b.item.nama,
              },
            });
            await tx.batch.update({ where: { id: p.batchId }, data: { qtySisa: { decrement: p.qty } } });
            await tx.stockMovement.create({
              data: {
                itemId: b.item.id,
                batchId: p.batchId,
                qty: -p.qty,
                tipe: "SALE",
                refType: "SALE",
                refId: sale.id,
                userId: kasir?.id,
              },
            });
          }
        }
      });
    }
    console.log("3 penjualan contoh hari ini dibuat.");
  }

  console.log("Seed selesai. Akun (ganti passwordnya sebelum dipakai beneran):");
  for (const u of users) {
    console.log(`  ${u.role.padEnd(9)} ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
