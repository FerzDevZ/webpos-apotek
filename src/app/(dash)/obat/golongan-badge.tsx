import { GOLONGAN_LABEL, type Golongan } from "@/lib/constants";

/** Warna badge mengikuti risiko regulasi, bukan sekadar dekorasi. */
const GAYA: Record<string, string> = {
  KERAS: "bg-danger/10 text-danger",
  NARKOTIKA: "bg-danger/10 text-danger",
  PSIKOTROPIKA: "bg-danger/10 text-danger",
  BEBAS_TERBATAS: "bg-warn/15 text-warn",
};

export function GolonganBadge({ golongan }: { golongan: string }) {
  const label = GOLONGAN_LABEL[golongan as Golongan] ?? golongan;
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${GAYA[golongan] ?? "bg-inset text-ink-2"}`}>
      {label}
    </span>
  );
}
