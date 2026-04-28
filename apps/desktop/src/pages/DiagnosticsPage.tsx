import { API_BASE_URL } from "../api/config";
import { Panel } from "../components/Panel";
import { useApiHealth } from "../hooks/useApiHealth";

export function DiagnosticsPage() {
  const apiHealth = useApiHealth();

  const localApiValue =
    apiHealth.status === "success"
      ? `${apiHealth.data.service} ${apiHealth.data.version}`
      : apiHealth.status === "loading"
        ? "Checking"
        : "Unavailable";
  const databaseValue =
    apiHealth.status === "success"
      ? apiHealth.data.database_configured
        ? "Configured"
        : "Missing URL"
      : apiHealth.status === "loading"
        ? "Checking"
        : "Unavailable";
  const databaseState =
    apiHealth.status === "success"
      ? apiHealth.data.database_configured
        ? "success"
        : "error"
      : apiHealth.status;

  return (
    <Panel title="Status">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Local API base URL</p>
          <p className="mt-1 break-all text-sm font-semibold text-ink">{API_BASE_URL}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
          onClick={apiHealth.refresh}
          disabled={apiHealth.status === "loading"}
        >
          {apiHealth.status === "loading" ? "Checking..." : "Refresh"}
        </button>
      </div>

      {apiHealth.status === "error" ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {apiHealth.error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <StatusCard label="Local API" value={localApiValue} state={apiHealth.status} />
        <StatusCard label="Database URL" value={databaseValue} state={databaseState} />
        <StatusCard label="Provider" value="Not configured" state="idle" />
      </div>

      {apiHealth.status === "success" ? (
        <dl className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm md:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase text-stone-500">Environment</dt>
            <dd className="mt-1 font-semibold">{apiHealth.data.environment}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-stone-500">Service</dt>
            <dd className="mt-1 font-semibold">{apiHealth.data.service}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-stone-500">Version</dt>
            <dd className="mt-1 font-semibold">{apiHealth.data.version}</dd>
          </div>
        </dl>
      ) : null}
    </Panel>
  );
}

function StatusCard({
  label,
  value,
  state
}: {
  label: string;
  value: string;
  state: "idle" | "loading" | "success" | "error";
}) {
  const stateClass = {
    idle: "bg-stone-100 text-stone-700",
    loading: "bg-denim/10 text-denim",
    success: "bg-pine/10 text-pine",
    error: "bg-red-100 text-red-700"
  }[state];

  const stateLabel = {
    idle: "Pending",
    loading: "Checking",
    success: "Online",
    error: "Error"
  }[state];

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stateClass}`}>{stateLabel}</span>
      </div>
      <p className="mt-3 text-sm font-semibold">{value}</p>
    </div>
  );
}
