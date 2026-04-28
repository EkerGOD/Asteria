import { Panel } from "../components/Panel";

const projectRows = ["Asteria MVP", "Research Inbox", "Writing Desk"];

export function ProjectsPage() {
  return (
    <Panel title="Project List">
      <div className="grid gap-3 md:grid-cols-3">
        {projectRows.map((row, index) => (
          <div key={row} className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm font-semibold">{row}</p>
            <p className="mt-3 text-xs text-stone-600">{index === 0 ? "Active" : "Available"}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
