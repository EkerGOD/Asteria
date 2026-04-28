import { Metric, Panel } from "../components/Panel";

export function SettingsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Provider">
        <div className="space-y-3">
          <Metric label="Base URL" value="Unset" />
          <Metric label="Chat model" value="Unset" />
          <Metric label="Embedding model" value="Unset" />
        </div>
      </Panel>

      <Panel title="Desktop">
        <div className="space-y-3">
          <Metric label="Theme" value="System" />
          <Metric label="API host" value="127.0.0.1" />
          <Metric label="API port" value="Pending" />
        </div>
      </Panel>
    </div>
  );
}
