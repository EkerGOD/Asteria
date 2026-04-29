import { AppShell } from "./components/AppShell";

function App() {
  return (
    <AppShell>
      <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
        <div className="mb-4 rounded-full border-2 border-dashed border-stone-300 p-6">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 20L18 26L28 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-medium text-stone-500">Asteria / 星识</p>
        <p className="mt-1 text-sm">Open a file from the browser or start a chat to begin.</p>
        <div className="mt-6 flex gap-2 text-xs text-stone-400">
          <kbd className="rounded border border-stone-300 bg-white px-2 py-1 font-mono">Ctrl+P</kbd>
          <span className="py-1">Command Palette</span>
        </div>
      </div>
    </AppShell>
  );
}

export default App;
