"use client";

import { useActionState } from "react";
import { simpanOutlet, type OutletState } from "@/app/actions/outlet";

export type OutletInitial = {
  nama: string;
  alamat: string;
  telp: string;
  apoteker: string;
  sia: string;
  sipa: string;
  footer: string;
};

type Field = {
  name: keyof OutletInitial;
  label: string;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  textarea?: boolean;
};

const SEKSI: { judul: string; deskripsi: string; fields: Field[] }[] = [
  {
    judul: "Identitas",
    deskripsi: "Tampil di struk dan kop resep.",
    fields: [
      { name: "nama", label: "Nama apotek", placeholder: "Apotek Sehat Sentosa", wide: true },
      { name: "alamat", label: "Alamat", placeholder: "Jl. Melati No. 12", wide: true },
      { name: "telp", label: "Telepon", placeholder: "0812-0000-0000" },
    ],
  },
  {
    judul: "Perizinan",
    deskripsi: "SIA untuk apotek, SIPA untuk apoteker penanggung jawab.",
    fields: [
      { name: "apoteker", label: "Apoteker penanggung jawab", placeholder: "Apt. ..., S.Farm." },
      { name: "sia", label: "No. SIA", hint: "Surat Izin Apotek" },
      { name: "sipa", label: "No. SIPA", hint: "Surat Izin Praktik Apoteker" },
    ],
  },
  {
    judul: "Struk",
    deskripsi: "Catatan kecil di bagian bawah struk pembelian.",
    fields: [
      {
        name: "footer",
        label: "Catatan kaki struk",
        placeholder: "Obat diminum sesuai aturan pakai",
        wide: true,
        textarea: true,
      },
    ],
  },
];

export function OutletForm({ initial }: { initial: OutletInitial }) {
  const [state, action, pending] = useActionState<OutletState, FormData>(simpanOutlet, null);

  return (
    <form action={action} className="card max-w-2xl">
      {SEKSI.map((seksi, i) => (
        <div key={seksi.judul} className={i === 0 ? "p-5" : "border-t border-line p-5"}>
          <h2 className="text-sm font-semibold">{seksi.judul}</h2>
          <p className="mt-0.5 text-xs text-muted">{seksi.deskripsi}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {seksi.fields.map((f) => (
              <div key={f.name} className={f.wide ? "sm:col-span-2" : ""}>
                <label htmlFor={f.name} className="block text-sm font-medium text-ink-2">
                  {f.label}
                  {f.hint && <span className="ml-1 font-normal text-muted">({f.hint})</span>}
                </label>
                {f.textarea ? (
                  <textarea id={f.name} name={f.name} rows={2} defaultValue={initial[f.name]} placeholder={f.placeholder} className="input mt-1.5" />
                ) : (
                  <input
                    id={f.name}
                    name={f.name}
                    defaultValue={initial[f.name]}
                    placeholder={f.placeholder}
                    className="input mt-1.5"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-end gap-3 border-t border-line bg-inset/50 px-5 py-3.5">
        {state?.error && (
          <p role="alert" className="mr-auto rounded-lg bg-danger/10 px-3 py-1.5 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state?.sukses && !state.error && (
          <p className="mr-auto text-sm font-medium text-brand-ink">Pengaturan tersimpan.</p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
