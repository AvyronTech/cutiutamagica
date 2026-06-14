import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Layout from "@/admin/Layout";
import { getMyRole } from "@/lib/admin.functions";

function AdminGate() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");

  useEffect(() => {
    let alive = true;
    getMyRole()
      .then((r) => {
        if (!alive) return;
        setState(r.isAdmin ? "ok" : "forbidden");
      })
      .catch(() => alive && setState("forbidden"));
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
        <div className="max-w-md text-center text-slate-200">
          <h1 className="text-2xl font-semibold mb-2">Acces restricționat</h1>
          <p className="text-slate-400 text-sm mb-6">
            Contul tău nu are permisiuni de administrator.
          </p>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
          >
            Înapoi la site
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});
