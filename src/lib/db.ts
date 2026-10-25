/**
 * PrismaClient singleton.
 * Next.js hot-reload membuat ulang modul tiap perubahan kode — tanpa ini
 * koneksi Prisma menumpuk sampai SQLite-nya kehabisan handle.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
