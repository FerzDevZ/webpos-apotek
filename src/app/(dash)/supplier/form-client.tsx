"use client";

import { useActionState } from "react";
import { simpanSupplier, hapusSupplier, type SupplierState } from "@/app/actions/supplier";

export function SupplierForm({
  initial,
}: {
  initial?: { id: string; nama: string; telp: string; alamat: string };
}) {
  const [state, action, pending] = useActionState<SupplierState, FormData>(simpanSupplier, null);

  return (
    <form action={action} className="card max-w-xl p-5" id="form">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <h2 className="text-sm font-semibold">{initial ? "Edit supplier" : "Tambah supplier"}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="s-nama" className="block text-sm font-medium text-ink-2">Nama <span className="text-danger">*</span></label>
          <input id="s-nama" name="nama" required defaultValue={initial?.nama} className="input mt-1" placeholder="PT Kimia Farma (PBF)" />
        </div>
        <div>
          <label htmlFor="s-telp" className="block text-sm font-medium text-ink-2">Telepon</label>
          <input id="s-telp" name="telp" defaultValue={initial?.telp} className="input mt-1" placeholder="021-…" />
        </div>
        <div>
          <label htmlFor="s-alamat" className="block text-sm font-medium text-ink-2">Alamat</label>
          <input id="s-alamat" name="alamat" defaultValue={initial?.alamat} className="input mt-1" />
        </div>
      </div>
      {state?.error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.sukses && <p className="mt-3 text-sm font-medium text-brand-ink">Tersimpan.</p>}
      <div className="mt-4 flex justify-end gap-2">
        {initial && (
          <a href="/supplier" className="btn btn-outline">Batal</a>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </form>
  );
}

export function HapusSupplierButton({ id, nama }: { id: string; nama: string }) {
  const fn = hapusSupplier.bind(null, id);
  return (
    <form
      action={fn}
      onSubmit={(e) => {
        if (!confirm(`Hapus supplier "${nama}"?`)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none transition-colors duration-150 hover:bg-inset hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
      >
        Hapus
      </button>
    </form>
  );
}
