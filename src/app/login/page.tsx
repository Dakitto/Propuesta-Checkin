"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, UserRound } from "lucide-react";

import { usePortal } from "@/components/portal-provider";

export default function LoginPage() {
  const { config, hydrated, isAuthenticated, login } = usePortal();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/checkin");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const next = new URLSearchParams(window.location.search).get("next");
    if (next) {
      setNextPath(next);
    }
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [hydrated, isAuthenticated, nextPath, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const success = login(username.trim(), password);

    if (!success) {
      setError("Credenciales inválidas. Verifica tu usuario y contraseña.");
      return;
    }

    router.replace(nextPath);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.25),_transparent_35%)]" />
      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-white/95 p-8 shadow-2xl shadow-indigo-950/20 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">
            Acceso seguro
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{config.siteName}</h1>
          <p className="mt-3 text-sm text-slate-500">
            Ingresa con tus credenciales para registrar asistencia de consejeros.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Usuario</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
              <UserRound className="h-5 w-5 text-slate-400" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Contraseña</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
              <LockKeyhole className="h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500"
          >
            Ingresar
          </button>
        </form>

        <div className="mt-8 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Credenciales por defecto</p>
          <p className="mt-1">Usuario: admin</p>
          <p>Contraseña: checkin2024</p>
        </div>
      </section>
    </main>
  );
}
