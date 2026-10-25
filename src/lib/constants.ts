/** Konstanta domain. Satu sumber kebenaran untuk string enum di DB (lihat schema.prisma). */

export const GOLONGAN = {
  BEBAS: "BEBAS",
  BEBAS_TERBATAS: "BEBAS_TERBATAS",
  KERAS: "KERAS",
  NARKOTIKA: "NARKOTIKA",
  PSIKOTROPIKA: "PSIKOTROPIKA",
  ALKES: "ALKES",
  HERBAL: "HERBAL",
} as const;
export type Golongan = (typeof GOLONGAN)[keyof typeof GOLONGAN];

export const GOLONGAN_LABEL: Record<Golongan, string> = {
  BEBAS: "Obat Bebas",
  BEBAS_TERBATAS: "Bebas Terbatas",
  KERAS: "Obat Keras",
  NARKOTIKA: "Narkotika",
  PSIKOTROPIKA: "Psikotropika",
  ALKES: "Alkes",
  HERBAL: "Herbal / Jamu",
};

/** Golongan yang secara regulasi wajib resep dokter. */
export const WAJIB_RESEP: Golongan[] = ["KERAS", "NARKOTIKA", "PSIKOTROPIKA", "BEBAS_TERBATAS"];

/** Golongan yang butuh pencatatan khusus / buku tersendiri. */
export const BUTUH_CATATAN_KHUSUS: Golongan[] = ["NARKOTIKA", "PSIKOTROPIKA"];

export const METODE_BAYAR = ["TUNAI", "QRIS", "DEBIT", "TRANSFER"] as const;
export type MetodeBayar = (typeof METODE_BAYAR)[number];

export const STATUS_SALE = { PAID: "PAID", VOID: "VOID" } as const;

export const TIPE_MOVEMENT = {
  PURCHASE: "PURCHASE",
  SALE: "SALE",
  RETURN_SUPPLIER: "RETURN_SUPPLIER",
  RETURN_CUSTOMER: "RETURN_CUSTOMER",
  ADJUST: "ADJUST",
  DISPOSE: "DISPOSE",
  VOID_SALE: "VOID_SALE",
} as const;

export const ROLE = { ADMIN: "ADMIN", APOTEKER: "APOTEKER", KASIR: "KASIR" } as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALASAN_DISPOSE = ["EXPIRED", "RUSAK", "RETUR_PBF"] as const;

/** Ambang hari peringatan kadaluarsa. */
export const ED_THRESHOLDS = [30, 60, 90] as const;
export const DEFAULT_ED_WARN_DAYS = 30;

export function wajibResep(golongan: string, requiresResep: boolean): boolean {
  return requiresResep || (WAJIB_RESEP as string[]).includes(golongan);
}
