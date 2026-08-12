import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  authenticateUser,
  createSessionToken,
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionToken(token);

  return NextResponse.json({ session });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  const username = body?.username?.trim() || "";
  const password = body?.password || "";

  const session = authenticateUser(username, password);
  if (!session) {
    return NextResponse.json(
      { message: "Credenciales inválidas. Verifica tu usuario y contraseña." },
      { status: 401 },
    );
  }

  const token = createSessionToken(session);
  const response = NextResponse.json({ session });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
