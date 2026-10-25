"use client";

import { useActionState, useState } from "react";
import { buatPengguna, resetPassword, type PenggunaState } from "@/app/actions/pengguna";

export function BuatPenggunaForm() {
  const [state, action, pending] = useActionState<PenggunaState, FormData>(buatPengguna, null);

  return (
    <form action={action} className="card max-w-xl p-5">
      <h2 className="text-sm font-semibold">Tambah pengguna</h2>
      <p className="mt-0.5 text-xs text-muted">Kasir menjual, apoteker melayani resep, admin mengatur semuanya.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nama" className="block text-sm font-medium text-ink-2">Nama</label>
          <input id="nama" name="nama" required className="input mt-1" placeholder="Kasir Dua" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-2">Email</label>
          <input id="email" name="email" type="email" required className="input mt-1" placeholder="nama@apotek.test" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-2">Password awal</label>
          <input id="password" name="password" type="text" required minLength={6} className="input mt-1 font-mono text-[13px]" placeholder="minimal 6 karakter" />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-ink-2">Role</label>
          <select id="role" name="role" className="input mt-1" defaultValue="KASIR">
            <option value="KASIR">Kasir</option>
            <option value="APOTEKER">Apoteker</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      {state?.error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.sukses && <p className="mt-3 text-sm font-medium text-brand-ink">Pengguna dibuat.</p>}
      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Menyimpan…" : "Buat pengguna"}</button>
      </div>
    </form>
  );
}

export function ResetPasswordButton({ userId, nama }: { userId: string; nama: string }) {
  const [terbuka, setTerbuka] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");

  async function submit() {
    setPending(true);
    setPesan(null);
    const hasil = await resetPassword(userId, password);
    setPending(false);
    if (hasil?.error) setPesan(hasil.error);
    else {
      setPesan("Password diganti.");
      setPassword("");
    }
  }

  if (!terbuka) {
    return (
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 outline-none transition-colors duration-150 hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        Reset password
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password baru"
        aria-label={`Password baru untuk ${nama}`}
        className="input w-36 py-1 text-xs font-mono"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending || password.length < 6}
        className="rounded-md px-2 py-1 text-xs font-semibold text-brand-ink outline-none hover:bg-inset focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
      >
        {pending ? "…" : "Simpan"}
      </button>
      <button
        type="button"
        onClick={() => { setTerbuka(false); setPesan(null); }}
        className="rounded-md px-1 py-1 text-xs text-muted outline-none hover:bg-inset focus-visible:outline-2 focus-visible:outline-brand"
        aria-label="Batal reset password"
      >
        ✕
      </button>
      {pesan && <span className="text-xs text-muted">{pesan}</span>}
    </span>
  );
}
