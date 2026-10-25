/**
 * Export CSV penjualan untuk periode. Teks UTF-8 dengan BOM supaya Excel
 * tidak merusak karakter Indonesia.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "APOTEKER") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const fromStr = req.nextUrl.searchParams.get("from") ?? "";
  const toStr = req.nextUrl.searchParams.get("to") ?? "";
  const dari = new Date(`${fromStr}T00:00:00`);
  const ke = new Date(`${toStr}T23:59:59.999`);
  if (Number.isNaN(dari.getTime()) || Number.isNaN(ke.getTime()) || dari > ke) {
    return new NextResponse("Rentang tanggal tidak valid", { status: 400 });
  }

  const sales = await db.sale.findMany({
    where: { tanggal: { gte: dari, lte: ke } },
    orderBy: { tanggal: "asc" },
    include: {
      kasir: { select: { nama: true } },
      items: { include: { batch: { select: { hargaBeli: true } } } },
    },
  });

  const baris: string[] = [];
  baris.push("no_struk;tanggal;kasir;metode;status;subtotal;diskon;total;hpp;laba");
  for (const x of sales) {
    const hpp = x.items.reduce((a, it) => a + it.qtyDasar * (it.batch?.hargaBeli ?? 0), 0);
    const kolom = [
      x.noStruk,
      x.tanggal.toISOString(),
      x.kasir?.nama ?? "",
      x.metodeBayar,
      x.status,
      String(x.subtotal),
      String(x.diskon),
      String(x.total),
      String(hpp),
      String(x.total - hpp),
    ];
    baris.push(kolom.join(";"));
  }

  const csv = "\uFEFF" + baris.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="penjualan-${fromStr}-${toStr}.csv"`,
    },
  });
}
