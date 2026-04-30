import { AppShell } from "./components/AppShell";
import { Icon } from "./components/Icon";

function App() {
  return (
    <AppShell>
      <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
        <div className="mb-4 rounded-full border-2 border-dashed border-stone-300 p-6">
          <Icon name="workspace" size={40} />
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
