"use client";

import { useActionState } from "react";
import { simpanPelanggan, type PelangganState } from "@/app/actions/pelanggan";

export type PelangganInitial = {
  id: string;
  nama: string;
  telp: string;
  alamat: string;
  tipe: string;
  catatan: string;
};

export function PelangganForm({ initial }: { initial?: PelangganInitial }) {
  const [state, action, pending] = useActionState<PelangganState, FormData>(simpanPelanggan, null);

  return (
    <form action={action} className="card max-w-xl p-5" id="form">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <h2 className="text-sm font-semibold">{initial ? "Edit pelanggan" : "Tambah pelanggan"}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="p-nama" className="block text-sm font-medium text-ink-2">Nama <span className="text-danger">*</span></label>
          <input id="p-nama" name="nama" required defaultValue={initial?.nama} className="input mt-1" placeholder="Bu Sari" />
        </div>
        <div>
          <label htmlFor="p-telp" className="block text-sm font-medium text-ink-2">Telepon</label>
          <input id="p-telp" name="telp" defaultValue={initial?.telp} className="input mt-1" placeholder="08…" />
        </div>
        <div>
          <label htmlFor="p-tipe" className="block text-sm font-medium text-ink-2">Tipe</label>
          <select id="p-tipe" name="tipe" defaultValue={initial?.tipe ?? "UMUM"} className="input mt-1">
            <option value="UMUM">Umum</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-catatan" className="block text-sm font-medium text-ink-2">Catatan</label>
          <input id="p-catatan" name="catatan" defaultValue={initial?.catatan} className="input mt-1" placeholder="Alergi: amoxicillin" />
        </div>
      </div>
      {state?.error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.sukses && <p className="mt-3 text-sm font-medium text-brand-ink">Tersimpan.</p>}
      <div className="mt-4 flex justify-end gap-2">
        {initial && <a href="/pelanggan" className="btn btn-outline">Batal</a>}
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </form>
  );
}
