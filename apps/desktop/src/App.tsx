import { useState } from "react";
import { ChatPage } from "./pages/ChatPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { sections, type SectionId } from "./sections";

function App() {
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("chat");
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="flex min-h-screen">
        <aside className="flex w-64 shrink-0 flex-col border-r border-stone-300/80 bg-white/80 px-4 py-5">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase text-pine">Asteria / 星识</p>
            <h1 className="mt-1 text-2xl font-semibold">Knowledge Workbench</h1>
          </div>

          <nav className="space-y-1" aria-label="Primary">
            {sections.map((section) => {
              const isActive = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={[
                    "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                    isActive
                      ? "bg-pine text-white shadow-sm"
                      : "text-stone-700 hover:bg-stone-100 hover:text-ink"
                  ].join(" ")}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-stone-300 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Local Mode</p>
            <p className="mt-2 text-sm text-stone-700">FastAPI-backed Asteria desktop scaffold.</p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-stone-300/80 bg-surface px-8 py-6">
            <p className="text-sm font-semibold uppercase text-clay">{activeSection.label}</p>
            <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-3xl font-semibold">{activeSection.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-stone-700">{activeSection.description}</p>
              </div>
              <div className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700">
                MVP desktop scaffold
              </div>
            </div>
          </header>

          <section className="flex-1 overflow-auto px-8 py-6">
            <SectionContent sectionId={activeSectionId} />
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionContent({ sectionId }: { sectionId: SectionId }) {
  switch (sectionId) {
    case "chat":
      return <ChatPage />;
    case "knowledge":
      return <KnowledgePage />;
    case "projects":
      return <ProjectsPage />;
    case "settings":
      return <SettingsPage />;
    case "diagnostics":
      return <DiagnosticsPage />;
  }
}

export default App;
