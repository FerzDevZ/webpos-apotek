/**
 * Proxy Next.js 16 (pengganti middleware) — cek optimis untuk login & role.
 *
 * Hanya membaca cookie (murah, tanpa DB). Pemeriksaan sesungguhnya tetap di
 * DAL (`src/lib/auth.ts`) dekat sumber data — proxy hanyalah lapis pertama
 * supaya user dialihkan cepat, bukan pengaman tunggal.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { bolehAkses } from "@/lib/nav";
import type { Role } from "@/lib/constants";

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/login") {
    const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const login = new URL("/login", req.url);
    return NextResponse.redirect(login);
  }

  if (!bolehAkses(path, session.role as Role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Semua halaman kecuali aset statis & API. Matcher mengecualikan file
// (path yang mengandung titik) dan folder internal Next.
export const config = {
  matcher: ["/((?!api|_next/.*).*)"],
};
