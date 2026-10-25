import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { StrukAksi } from "./aksi";

export default function StrukPage(props: PageProps<"/struk/[id]">) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted">memuat struk…</div>}>
      <Isi idPromise={props.params} searchParamsPromise={props.searchParams} />
    </Suspense>
  );
}

async function Isi({
  idPromise,
  searchParamsPromise,
}: {
  idPromise: Promise<{ id: string }>;
  searchParamsPromise: Promise<{ cetak?: string }>;
}) {
  await connection();
  const [{ id }, sp, user] = await Promise.all([idPromise, searchParamsPromise, getCurrentUser()]);

  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      items: true,
      kasir: { select: { nama: true } },
      customer: { select: { nama: true } },
      resep: { select: { noResep: true, pasienNama: true } },
    },
  });
  if (!sale) notFound();

  const outlet = await db.outlet.findFirst({ orderBy: { createdAt: "asc" } });
  const bolehVoid = user.role === ROLE.ADMIN || user.role === ROLE.APOTEKER;

  const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(sale.tanggal);
  const voided = sale.status === "VOID";

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-100/70 py-8 print:bg-white print:py-0">
      {/* Judul layar (tidak tercetak) */}
      <div className="no-print mb-4 flex w-full max-w-sm items-center justify-between px-4">
        <Link href="/kasir" className="text-sm font-medium text-zinc-500 outline-none hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-brand">
          ← Kembali ke kasir
        </Link>
        {bolehVoid && !voided && (
          <StrukAksi saleId={sale.id} metodeBayar={sale.metodeBayar} total={sale.total} cetakOtomatis={sp.cetak === "1"} />
        )}
        {(!bolehVoid || voided) && <StrukCetakOnly cetakOtomatis={sp.cetak === "1"} />}
      </div>

      {voided && (
        <p className="no-print mb-3 max-w-sm rounded-lg bg-danger/10 px-4 py-2.5 text-center text-sm font-medium text-danger">
          STRUK DIBATALKAN — {sale.voidReason}
        </p>
      )}

      {/* Kertas struk 58mm */}
      <div className="w-[320px] bg-white px-5 py-4 font-mono text-[12px] leading-relaxed text-zinc-900 shadow-sm print:w-[58mm] print:max-w-[58mm] print:p-0 print:text-[10px] print:shadow-none">
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-wide print:text-[11px]">{outlet?.nama ?? "Apotek"}</p>
          {outlet?.alamat && <p className="text-[10px] print:text-[8px]">{outlet.alamat}</p>}
          {outlet?.telp && <p className="text-[10px] print:text-[8px]">Telp. {outlet.telp}</p>}
          {outlet?.sia && <p className="text-[10px] print:text-[8px]">SIA: {outlet.sia}</p>}
        </div>
        <p className="my-2 border-t border-dashed border-zinc-400" />

        <p>No. {sale.noStruk}</p>
        <p>{fmtTanggal}</p>
        <p>Kasir: {sale.kasir?.nama ?? "-"}</p>
        {sale.customer && <p>Pelanggan: {sale.customer.nama}</p>}
        {sale.resep && <p>Resep: {sale.resep.noResep} ({sale.resep.pasienNama})</p>}
        <p className="my-2 border-t border-dashed border-zinc-400" />

        <table className="w-full">
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id} className="align-top">
                <td colSpan={2}>
                  <p className="font-bold">{it.namaSnapshot}</p>
                  <p className="text-[10px] print:text-[8px]">
                    {it.qtyUnit} {it.faktor > 1 ? `× ${it.faktor} = ${it.qtyDasar}` : ""} @ {formatRupiah(it.hargaSatuan)}
                  </p>
                </td>
                <td className="whitespace-nowrap text-right font-medium">{formatRupiah(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="my-2 border-t border-dashed border-zinc-400" />

        <table className="w-full">
          <tbody>
            <tr><td>Subtotal</td><td className="text-right">{formatRupiah(sale.subtotal)}</td></tr>
            {sale.diskon > 0 && <tr><td>Diskon</td><td className="text-right">-{formatRupiah(sale.diskon)}</td></tr>}
            <tr className="text-[14px] font-bold print:text-[11px]"><td>TOTAL</td><td className="text-right">{formatRupiah(sale.total)}</td></tr>
            <tr><td>Bayar ({sale.metodeBayar.toLowerCase()})</td><td className="text-right">{formatRupiah(sale.bayar)}</td></tr>
            {sale.kembali > 0 && <tr><td>Kembali</td><td className="text-right">{formatRupiah(sale.kembali)}</td></tr>}
          </tbody>
        </table>
        <p className="my-2 border-t border-dashed border-zinc-400" />

        <div className="text-center text-[10px] print:text-[8px]">
          {outlet?.apoteker && <p>Apoteker: {outlet.apoteker}</p>}
          {outlet?.footer && <p className="mt-1">{outlet.footer}</p>}
          <p className="mt-1">Simpan struk ini sebagai bukti pembelian</p>
        </div>
      </div>
    </div>
  );
}

function StrukCetakOnly({ cetakOtomatis }: { cetakOtomatis: boolean }) {
  return <StrukAksi saleId="" metodeBayar="" total={0} cetakOtomatis={cetakOtomatis} voidDisabled />;
}
