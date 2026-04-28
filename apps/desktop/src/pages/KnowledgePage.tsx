import { Metric, Panel } from "../components/Panel";

const knowledgeRows = ["Embedding architecture", "Desktop packaging notes", "RAG answer contract"];

export function KnowledgePage() {
  return (
    <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <Panel title="Filters">
        <div className="space-y-3">
          <Metric label="Project" value="All" />
          <Metric label="Tags" value="None" />
          <Metric label="Search" value="Empty" />
        </div>
      </Panel>

      <Panel title="Knowledge Units">
        <div className="grid gap-3 md:grid-cols-3">
          {knowledgeRows.map((row) => (
            <div key={row} className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold">{row}</p>
              <p className="mt-3 text-xs text-stone-600">Draft</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
