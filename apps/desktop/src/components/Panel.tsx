import type { ReactNode } from "react";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-300 bg-white/70 p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase text-stone-600">{title}</h3>
      {children}
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white px-4 py-3">
      <span className="shrink-0 text-sm text-stone-600">{label}</span>
      <span className="min-w-0 break-all text-right text-sm font-semibold">{value}</span>
    </div>
  );
}
