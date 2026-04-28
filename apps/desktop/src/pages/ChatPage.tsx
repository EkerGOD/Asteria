import { Metric, Panel } from "../components/Panel";

const conversationRows = ["Project memory review", "Research outline", "Provider setup notes"];

export function ChatPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Panel title="Conversations">
        <div className="space-y-3">
          {conversationRows.map((row) => (
            <div key={row} className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm">
              {row}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Source References">
        <div className="space-y-3">
          <Metric label="Selected project" value="Asteria MVP" />
          <Metric label="Retrieved chunks" value="0" />
          <Metric label="Provider model" value="Unset" />
        </div>
      </Panel>
    </div>
  );
}
