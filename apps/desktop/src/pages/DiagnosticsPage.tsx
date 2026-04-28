import { Panel } from "../components/Panel";

const statusRows = [
  { label: "Local API", value: "Not connected" },
  { label: "Database", value: "Pending setup" },
  { label: "Provider", value: "Not configured" }
];

export function DiagnosticsPage() {
  return (
    <Panel title="Status">
      <div className="grid gap-3 md:grid-cols-3">
        {statusRows.map((row) => (
          <div key={row.label} className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-stone-500">{row.label}</p>
            <p className="mt-2 text-sm font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
