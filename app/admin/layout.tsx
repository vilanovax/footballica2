import { cookies } from "next/headers";
import { ShieldAlert, Trophy } from "lucide-react";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/ui/sonner";

// Admin reads cookies + live DB data — never prerender.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Footballica Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authorized = isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);

  // Gate at the layout level: unauthorized visitors never see admin content.
  if (!authorized) {
    return (
      <div
        dir="ltr"
        className="admin flex min-h-dvh items-center justify-center bg-slate-100 p-6"
      >
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <ShieldAlert className="h-6 w-6 text-rose-500" strokeWidth={2} />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            Restricted area
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This dashboard is not available to standard users. Append a valid{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">
              ?secret=…
            </code>{" "}
            to unlock access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="admin flex min-h-dvh bg-slate-100 text-slate-900">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 py-5 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Footballica</p>
            <p className="text-xs text-slate-400">Admin CMS</p>
          </div>
        </div>
        <AdminNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h2 className="text-sm font-semibold text-slate-700">
            Content Management
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Read-only
          </span>
        </header>
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
