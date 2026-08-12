"use client";

import Link from "next/link";
import { PropsWithChildren, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { usePortal } from "@/components/portal-provider";

export function AuthGuard({ children }: PropsWithChildren) {
  const { hydrated, isAuthenticated, session } = usePortal();
  const router = useRouter();
  const pathname = usePathname();
  const isCheckerRestrictedRoute = session?.role === "checker" && !pathname.startsWith("/checkin");

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm shadow-2xl backdrop-blur">
          Validando sesión...
        </div>
      </div>
    );
  }

  if (isCheckerRestrictedRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Error 403</p>
          <h1 className="mt-3 text-3xl font-bold">Acceso denegado</h1>
          <p className="mt-3 text-sm text-slate-200">
            Tu perfil tiene permisos de chequeador y solo puede acceder al módulo de Check-In.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/checkin"
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Ir a Check-In
            </Link>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Cambiar usuario
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
