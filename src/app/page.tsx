"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { usePortal } from "@/components/portal-provider";

export default function HomePage() {
  const { hydrated, isAuthenticated } = usePortal();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(isAuthenticated ? "/checkin" : "/login");
  }, [hydrated, isAuthenticated, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm shadow-2xl backdrop-blur">
        Redirigiendo...
      </div>
    </main>
  );
}
