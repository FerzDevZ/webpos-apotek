-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "telp" TEXT,
    "apoteker" TEXT,
    "sia" TEXT,
    "sipa" TEXT,
    "footer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outletId" TEXT,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'KASIR',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "telp" TEXT,
    "alamat" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "telp" TEXT,
    "alamat" TEXT,
    "tipe" TEXT NOT NULL DEFAULT 'UMUM',
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kode" TEXT NOT NULL,
    "barcode" TEXT,
    "nama" TEXT NOT NULL,
    "kategori" TEXT,
    "golongan" TEXT NOT NULL DEFAULT 'BEBAS',
    "pabrik" TEXT,
    "satuanDasar" TEXT NOT NULL,
    "requiresResep" BOOLEAN NOT NULL DEFAULT false,
    "bahanRacikan" BOOLEAN NOT NULL DEFAULT false,
    "jualBebas" BOOLEAN NOT NULL DEFAULT true,
    "stokMinDasar" INTEGER NOT NULL DEFAULT 0,
    "hargaJualDasar" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "faktor" INTEGER NOT NULL,
    "hargaJual" INTEGER NOT NULL,
    "barcode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ItemUnit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "supplierId" TEXT,
    "noBatch" TEXT NOT NULL,
    "expiry" DATETIME NOT NULL,
    "qtyAwal" INTEGER NOT NULL,
    "qtySisa" INTEGER NOT NULL,
    "hargaBeli" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Batch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "qty" INTEGER NOT NULL,
    "tipe" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "userId" TEXT,
    "catatan" TEXT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noFaktur" TEXT NOT NULL,
    "outletId" TEXT,
    "supplierId" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" INTEGER NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unitId" TEXT,
    "qtyUnit" INTEGER NOT NULL,
    "faktor" INTEGER NOT NULL,
    "qtyDasar" INTEGER NOT NULL,
    "hargaBeli" INTEGER NOT NULL,
    "noBatch" TEXT NOT NULL,
    "expiry" DATETIME NOT NULL,
    "batchId" TEXT,
    "subtotal" INTEGER NOT NULL,
    CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ItemUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noStruk" TEXT NOT NULL,
    "outletId" TEXT,
    "kasirId" TEXT,
    "customerId" TEXT,
    "resepId" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "bayar" INTEGER NOT NULL,
    "kembali" INTEGER NOT NULL,
    "metodeBayar" TEXT NOT NULL DEFAULT 'TUNAI',
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_resepId_fkey" FOREIGN KEY ("resepId") REFERENCES "Resep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "unitId" TEXT,
    "qtyUnit" INTEGER NOT NULL,
    "faktor" INTEGER NOT NULL,
    "qtyDasar" INTEGER NOT NULL,
    "hargaSatuan" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,
    "namaSnapshot" TEXT NOT NULL,
    "isRacikan" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ItemUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noResep" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pasienNama" TEXT NOT NULL,
    "pasienTelp" TEXT,
    "pasienAlamat" TEXT,
    "umur" INTEGER,
    "dokter" TEXT NOT NULL,
    "noSIP" TEXT,
    "tipe" TEXT NOT NULL DEFAULT 'NON_RACIKAN',
    "iter" INTEGER NOT NULL DEFAULT 1,
    "catatan" TEXT,
    "customerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resep_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResepItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resepId" TEXT NOT NULL,
    "itemId" TEXT,
    "namaBahan" TEXT NOT NULL,
    "qtyMilli" INTEGER NOT NULL,
    "satuan" TEXT NOT NULL,
    "aturanPakai" TEXT,
    "jumlahDosis" INTEGER,
    "isRacikan" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ResepItem_resepId_fkey" FOREIGN KEY ("resepId") REFERENCES "Resep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResepItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpiryDisposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "catatan" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "ExpiryDisposal_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpiryDisposal_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Item_kode_key" ON "Item"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Item_barcode_key" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "ItemUnit_itemId_idx" ON "ItemUnit"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUnit_itemId_nama_key" ON "ItemUnit"("itemId", "nama");

-- CreateIndex
CREATE INDEX "Batch_itemId_expiry_idx" ON "Batch"("itemId", "expiry");

-- CreateIndex
CREATE INDEX "Batch_expiry_idx" ON "Batch"("expiry");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_itemId_noBatch_expiry_key" ON "Batch"("itemId", "noBatch", "expiry");

-- CreateIndex
CREATE INDEX "StockMovement_itemId_ts_idx" ON "StockMovement"("itemId", "ts");

-- CreateIndex
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_noStruk_key" ON "Sale"("noStruk");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_resepId_key" ON "Sale"("resepId");

-- CreateIndex
CREATE INDEX "Sale_tanggal_idx" ON "Sale"("tanggal");

-- CreateIndex
CREATE INDEX "SaleItem_itemId_idx" ON "SaleItem"("itemId");

-- CreateIndex
CREATE INDEX "SaleItem_batchId_idx" ON "SaleItem"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Resep_noResep_key" ON "Resep"("noResep");

-- CreateIndex
CREATE INDEX "Resep_tanggal_idx" ON "Resep"("tanggal");

-- CreateIndex
CREATE INDEX "ResepItem_resepId_idx" ON "ResepItem"("resepId");
