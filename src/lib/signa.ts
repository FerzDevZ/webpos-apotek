/**
 * Signa / aturan pakai / etiket.
 *
 * Ini bagian yang paling sering diremehkan pembuat POS umum, padahal ini
 * yang membuat apoteker percaya: etiket harus bisa dicetak persis seperti
 * yang ditulis dokter ("3 x 1 tab sesudah makan"), dan racikan harus
 * menghasilkan label "diminum 3x sehari 1 bungkus".
 */

export type SignaInput = {
  /** berapa kali sehari */
  frekuensi: number;
  /** berapa satuan dasar per sekali minum (boleh 0.5) */
  dosis: number;
  satuan: string; // tablet, kapsul, ml, bungkus, tetes
  /** waktu: SEBELUM_MAKAN | SESUDAH_MAKAN | SAAT_MAKAN | BEBAS */
  waktu?: "SEBELUM_MAKAN" | "SESUDAH_MAKAN" | "SAAT_MAKAN" | "BEBAS";
  /** mis. "kalau demam", "habiskan" */
  keterangan?: string;
  /** lama terapi, hari */
  lamaHari?: number;
};

const WAKTU_LABEL: Record<string, string> = {
  SEBELUM_MAKAN: "sebelum makan",
  SESUDAH_MAKAN: "sesudah makan",
  SAAT_MAKAN: "saat makan",
  BEBAS: "",
};

function fmtDosis(d: number): string {
  if (Number.isInteger(d)) return String(d);
  // 0.5 -> "1/2", 0.25 -> "1/4", sisanya pakai koma
  const known: Record<string, string> = { "0.5": "1/2", "0.25": "1/4", "0.75": "3/4", "0.333": "1/3" };
  const key = String(d);
  return known[key] ?? String(d).replace(".", ",");
}

/** "3 x 1 tablet sesudah makan" */
export function formatSigna(s: SignaInput): string {
  const bagian: string[] = [];
  bagian.push(`${s.frekuensi} x ${fmtDosis(s.dosis)} ${s.satuan}`);
  const w = s.waktu ? WAKTU_LABEL[s.waktu] : "";
  if (w) bagian.push(w);
  let out = bagian.join(" ");
  if (s.keterangan) out += `, ${s.keterangan}`;
  if (s.lamaHari && s.lamaHari > 0) out += ` (${s.lamaHari} hari)`;
  return out;
}

/** Baris besar di etiket (huruf kapital, seperti ditulis tangan): "3 X 1 TABLET SESUDAH MAKAN" */
export function formatEtiketBesar(s: SignaInput): string {
  return formatSigna(s).toUpperCase();
}

/** Parse "3x1" / "3 x 1" / "3x1 tab" jadi SignaInput dasar. Berguna saat input cepat. */
export function parseSignaCepat(input: string, satuan = "tablet"): SignaInput | null {
  const m = input.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  const frekuensi = Number.parseInt(m[1], 10);
  const dosis = Number.parseFloat(m[2].replace(",", "."));
  if (!frekuensi || !Number.isFinite(dosis) || dosis <= 0) return null;
  const sisa = input.slice(m.index! + m[0].length).toLowerCase();
  let waktu: SignaInput["waktu"] = "BEBAS";
  if (/sesudah|setelah|s\.?makan/.test(sisa) || /p\.?c\.?/.test(sisa)) waktu = "SESUDAH_MAKAN";
  else if (/sebelum|a\.?c\.?/.test(sisa)) waktu = "SEBELUM_MAKAN";
  else if (/saat makan|selagi makan/.test(sisa)) waktu = "SAAT_MAKAN";
  return { frekuensi, dosis, satuan, waktu };
}

/**
 * Jumlah yang harus diserahkan untuk resep.
 * 3 x 1 tab x 5 hari = 15 tablet. Untuk racikan: jumlah bungkus.
 */
export function hitungKebutuhan(s: SignaInput, lamaHari: number): number {
  if (lamaHari <= 0) return 0;
  return Math.ceil(s.frekuensi * s.dosis * lamaHari);
}

/** "diminum 3x sehari 1 bungkus" — label khas racikan (puyer/kapsul). */
export function labelRacikan(frekuensi: number, jumlahBungkus: number, keterangan?: string): string {
  let s = `DIMINUM ${frekuensi}X SEHARI 1 BUNGKUS`;
  if (keterangan) s += ` ${keterangan.toUpperCase()}`;
  return s;
}

/**
 * Copy resep (iter). Aturan: resep dengan iter > 1 boleh dilayani ulang,
 * setiap pelayanan mengurangi iter. Iter 0 = tidak boleh diulang.
 */
export function sisaIter(iterAwal: number, sudahDilayani: number): number {
  return Math.max(0, iterAwal - sudahDilayani);
}

export function bolehDiulang(iterAwal: number, sudahDilayani: number): boolean {
  return sisaIter(iterAwal, sudahDilayani) > 0;
}

/**
 * Teks etiket siap cetak. Lebar default 58mm (±32 karakter) supaya muat di
 * printer thermal murah dan juga bisa ditempel di kemasan.
 */
export type EtiketData = {
  apotek: string;
  noResep?: string;
  tanggal: string;
  pasien: string;
  namaObat: string;
  signaBesar: string;
  jumlah?: string;
  catatan?: string;
};

export function renderEtiket(d: EtiketData, lebar = 32): string {
  const line = "-".repeat(lebar);
  const wrap = (t: string) => {
    const words = t.split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > lebar) {
        if (cur) out.push(cur.trim());
        cur = w;
      } else cur = `${cur} ${w}`;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.join("\n");
  };
  const rows = [
    d.apotek.toUpperCase(),
    line,
    `No. Resep : ${d.noResep ?? "-"}`,
    `Tanggal   : ${d.tanggal}`,
    `Pasien    : ${d.pasien}`,
    line,
    wrap(d.namaObat),
    "",
    wrap(d.signaBesar),
    "",
  ];
  if (d.jumlah) rows.push(`Jumlah: ${d.jumlah}`);
  if (d.catatan) rows.push(wrap(`Catatan: ${d.catatan}`));
  rows.push(line, "OBAT HARUS DIHABISKAN", "SIMPAN DI TEMPAT SEJUK", "JAUH DARI ANAK-ANAK");
  return rows.join("\n");
}
