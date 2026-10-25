/**
 * Navigasi sidebar + tabel RBAC route. Satu sumber kebenaran untuk keduanya
 * supaya menu yang tampil dan route yang dilindungi tidak pernah beda cerita.
 *
 * Item `aktif: false` = modul belum dibangun (tampil redup di sidebar).
 * Tambahkan entri PROTECTED_PREFIX tiap kali modul baru punya halaman sungguhan.
 */
import { ROLE, type Role } from "./constants";

export type NavItem = {
  label: string;
  href: string;
  /** belum ada = modul direncanakan tapi belum dibangun */
  aktif: boolean;
  roles?: Role[];
};

export type NavSection = {
  judul: string;
  items: NavItem[];
};

const SEMUA: Role[] = [ROLE.ADMIN, ROLE.APOTEKER, ROLE.KASIR];

export const NAV_SECTIONS: NavSection[] = [
  {
    judul: "Operasional",
    items: [
      { label: "Dashboard", href: "/", aktif: true, roles: SEMUA },
      { label: "Kasir", href: "/kasir", aktif: true, roles: SEMUA },
      { label: "Resep", href: "/resep", aktif: true, roles: [ROLE.ADMIN, ROLE.APOTEKER] },
    ],
  },
  {
    judul: "Data & Stok",
    items: [
      { label: "Master Obat", href: "/obat", aktif: true, roles: SEMUA },
      { label: "Pembelian (PBF)", href: "/pembelian", aktif: true, roles: [ROLE.ADMIN, ROLE.APOTEKER] },
      { label: "Stok & Kadaluarsa", href: "/stok", aktif: true, roles: [ROLE.ADMIN, ROLE.APOTEKER] },
      { label: "Supplier", href: "/supplier", aktif: true, roles: [ROLE.ADMIN, ROLE.APOTEKER] },
      { label: "Pelanggan", href: "/pelanggan", aktif: true, roles: SEMUA },
    ],
  },
  {
    judul: "Laporan",
    items: [{ label: "Laporan", href: "/laporan", aktif: true, roles: [ROLE.ADMIN, ROLE.APOTEKER] }],
  },
  {
    judul: "Sistem",
    items: [
      { label: "Pengguna", href: "/pengguna", aktif: true, roles: [ROLE.ADMIN] },
      { label: "Pengaturan Outlet", href: "/pengaturan/outlet", aktif: true, roles: [ROLE.ADMIN] },
    ],
  },
];

/**
 * Prefix route -> role yang boleh masuk. Dicek optimis di proxy (dari cookie)
 * dan dicek ulang di DAL/halaman (dari DB). Route di luar daftar ini cukup
 * login saja (semua role).
 */
export const PROTECTED_PREFIX: { prefix: string; roles: Role[] }[] = [
  { prefix: "/pengguna", roles: [ROLE.ADMIN] },
  { prefix: "/pengaturan", roles: [ROLE.ADMIN] },
  { prefix: "/resep", roles: [ROLE.ADMIN, ROLE.APOTEKER] },
  { prefix: "/pembelian", roles: [ROLE.ADMIN, ROLE.APOTEKER] },
  { prefix: "/stok", roles: [ROLE.ADMIN, ROLE.APOTEKER] },
  { prefix: "/supplier", roles: [ROLE.ADMIN, ROLE.APOTEKER] },
  { prefix: "/laporan", roles: [ROLE.ADMIN, ROLE.APOTEKER] },
];

export function bolehAkses(path: string, role: Role): boolean {
  const aturan = PROTECTED_PREFIX.find((p) => path === p.prefix || path.startsWith(`${p.prefix}/`));
  if (!aturan) return true;
  return aturan.roles.includes(role);
}
