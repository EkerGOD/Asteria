export function StatusBar() {
  return (
    <div
      className="flex shrink-0 items-center gap-4 border-t border-stone-300/80 bg-white/90 px-4 text-xs text-stone-500"
      style={{ height: 24 }}
    >
      <span>Markdown</span>
      <span>Ln 1, Col 1</span>
      <span>0 words</span>
      <span>UTF-8</span>
      <div className="flex-1" />
      {/* Future extensions: git branch, AI status, etc. */}
    </div>
  );
}
