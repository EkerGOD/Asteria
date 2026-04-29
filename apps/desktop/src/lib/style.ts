export function inputClassName(error?: string): string {
  return [
    "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink outline-none transition",
    "focus:border-pine focus:ring-2 focus:ring-pine/20",
    error ? "border-red-300" : "border-stone-300"
  ].join(" ");
}
