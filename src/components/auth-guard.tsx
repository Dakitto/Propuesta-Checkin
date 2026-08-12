"use client";

import { PropsWithChildren, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { usePortal } from "@/components/portal-provider";

export function AuthGuard({ children }: PropsWithChildren) {
  const { hydrated, isAuthenticated } = usePortal();
  const router = useRouter();
  const pathname = usePathname();

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

  return <>{children}</>;
}
