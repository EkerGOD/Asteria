import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";
import { checkProviderHealth, listProviders } from "../api/client";
import type {
  AppDirectoryDiagnostics,
  DirectoryDiagnostic,
  ProviderHealthResponse,
} from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox } from "../components/FormFields";
import { Panel } from "../components/Panel";
import { useApiHealth } from "../hooks/useApiHealth";
import { isAbortError, toErrorMessage } from "../lib/errors";

type ProviderStatusState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; providerName: string; health: ProviderHealthResponse | null }
  | { status: "error"; message: string };

export function DiagnosticsPage({ onNavigateToSettings }: { onNavigateToSettings?: () => void }) {
  const apiHealth = useApiHealth();
  const [providerStatus, setProviderStatus] = useState<ProviderStatusState>({ status: "idle" });

  const checkProvider = useCallback(async (signal?: AbortSignal) => {
    setProviderStatus({ status: "loading" });

    try {
      const providers = await listProviders({ signal });
      const firstProvider = providers[0];

      if (!firstProvider) {
        setProviderStatus({
          status: "success",
          providerName: "Unset",
          health: null,
        });
        return;
      }

      try {
        const health = await checkProviderHealth(firstProvider.id);
        setProviderStatus({ status: "success", providerName: firstProvider.name, health });
      } catch {
        setProviderStatus({
          status: "success",
          providerName: firstProvider.name,
          health: {
            provider_id: firstProvider.id,
            status: "error",
            message: "Health check failed.",
            latency_ms: null,
          },
        });
      }
    } catch (error) {
      if (isAbortError(error)) return;
      setProviderStatus({ status: "error", message: toErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void checkProvider(controller.signal);
    return () => controller.abort();
  }, [checkProvider]);

  const refreshAll = useCallback(() => {
    apiHealth.refresh();
    void checkProvider();
  }, [apiHealth, checkProvider]);

  const isChecking = apiHealth.status === "loading" || providerStatus.status === "loading";

  /* ---- derived display values ---- */

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

  const databaseState: StatusState =
    apiHealth.status === "success"
      ? apiHealth.data.database_configured
        ? "success"
        : "error"
      : apiHealth.status;

  const providerValue =
    providerStatus.status === "loading"
      ? "Checking"
      : providerStatus.status === "error"
        ? "Unavailable"
        : providerStatus.status === "idle"
          ? "Not checked"
          : providerStatus.providerName === "Unset"
            ? "No provider configured"
            : providerStatus.health?.status === "ok"
              ? `${providerStatus.providerName} reachable`
              : `${providerStatus.providerName} unreachable`;

  const providerState: StatusState =
    providerStatus.status === "loading"
      ? "loading"
      : providerStatus.status === "error"
        ? "error"
        : providerStatus.status === "idle"
          ? "idle"
          : providerStatus.providerName === "Unset"
            ? "idle"
            : providerStatus.health?.status === "ok"
              ? "success"
              : "error";

  return (
    <Panel title="Diagnostics">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Local API base URL</p>
          <p className="mt-1 break-all text-sm font-semibold text-ink">{API_BASE_URL}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
          onClick={refreshAll}
          disabled={isChecking}
        >
          {isChecking ? "Checking..." : "Refresh"}
        </button>
      </div>

      {apiHealth.status === "error" ? <ErrorBox message={apiHealth.error} /> : null}
      {providerStatus.status === "error" ? <ErrorBox message={providerStatus.message} /> : null}

      {/* Status sections — vertical stack */}
      <div className="space-y-4">
        {/* Local API */}
        <DiagnosticSection title="Local API">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{localApiValue}</p>
            <StatusBadge state={apiHealth.status} />
          </div>
          {apiHealth.status === "success" && (
            <dl className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
              <DetailRow label="Environment" value={apiHealth.data.environment} />
              <DetailRow label="Service" value={apiHealth.data.service} />
              <DetailRow label="Version" value={apiHealth.data.version} />
            </dl>
          )}
        </DiagnosticSection>

        {/* Database */}
        <DiagnosticSection title="Database">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{databaseValue}</p>
            <StatusBadge state={databaseState} />
          </div>
        </DiagnosticSection>

        {apiHealth.status === "success" && (
          <DirectoryDiagnostics directories={apiHealth.data.directories} />
        )}

        {/* Provider */}
        <DiagnosticSection title="AI Provider">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{providerValue}</p>
            <StatusBadge state={providerState} />
          </div>

          {providerStatus.status === "success" && providerStatus.health && (
            <div
              className={[
                "mt-3 rounded-lg border px-4 py-3 text-sm",
                providerStatus.health.status === "ok"
                  ? "border-pine/20 bg-pine/10 text-pine"
                  : "border-red-200 bg-red-50 text-red-800",
              ].join(" ")}
            >
              <p className="font-semibold">
                {providerStatus.health.status === "ok" ? "Provider Reachable" : "Provider Error"}
              </p>
              <p className="mt-1">
                {providerStatus.health.message}
                {providerStatus.health.latency_ms !== null
                  ? ` ${providerStatus.health.latency_ms} ms`
                  : ""}
              </p>
            </div>
          )}

          {providerStatus.status === "success" && providerStatus.providerName === "Unset" && (
            <div className="mt-3">
              <EmptyState
                title="No provider configured."
                detail="Configure an OpenAI-compatible provider to enable chat and embeddings."
                action={
                  onNavigateToSettings
                    ? { label: "Go to Settings", onClick: onNavigateToSettings }
                    : undefined
                }
              />
            </div>
          )}
        </DiagnosticSection>
      </div>
    </Panel>
  );
}

type StatusState = "idle" | "loading" | "success" | "error";

function DiagnosticSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ state }: { state: StatusState }) {
  const classes = {
    idle: "bg-stone-100 text-stone-700",
    loading: "bg-denim/10 text-denim",
    success: "bg-pine/10 text-pine",
    error: "bg-red-100 text-red-700",
  }[state];

  const label = {
    idle: "Pending",
    loading: "Checking",
    success: "Online",
    error: "Error",
  }[state];

  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function DirectoryDiagnostics({
  directories,
}: {
  directories: AppDirectoryDiagnostics;
}) {
  return (
    <DiagnosticSection title="Data & Models Directories">
      <div className="space-y-3">
        <DirectoryStatusRow label="App data" diagnostic={directories.app_data} />
        <DirectoryStatusRow label="Models" diagnostic={directories.models} />
        <DirectoryStatusRow
          label="Embedding models"
          diagnostic={directories.embedding_models}
        />
      </div>
    </DiagnosticSection>
  );
}

function DirectoryStatusRow({
  label,
  diagnostic,
}: {
  label: string;
  diagnostic: DirectoryDiagnostic;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800">{label}</p>
          <p className="mt-1 break-all text-xs text-stone-600">{diagnostic.path}</p>
        </div>
        <DirectoryBadge status={diagnostic.status} />
      </div>
      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        <DetailRow label="Source" value={formatDirectorySource(diagnostic.source)} />
        <DetailRow label="Exists" value={diagnostic.exists ? "Yes" : "No"} />
        <DetailRow label="Writable" value={diagnostic.writable ? "Yes" : "No"} />
      </dl>
      <p className="mt-2 text-xs text-stone-500">{diagnostic.message}</p>
      {diagnostic.recovery_action && (
        <p className="mt-1 text-xs text-stone-500">{diagnostic.recovery_action}</p>
      )}
    </div>
  );
}

function DirectoryBadge({ status }: { status: DirectoryDiagnostic["status"] }) {
  const classes = {
    configured: "bg-pine/10 text-pine",
    defaulted: "bg-denim/10 text-denim",
    missing: "bg-amber/10 text-amber-700",
    unavailable: "bg-red-100 text-red-700",
  }[status];

  const label = {
    configured: "Configured",
    defaulted: "Default",
    missing: "Missing",
    unavailable: "Unavailable",
  }[status];

  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function formatDirectorySource(source: string): string {
  return source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-xs font-semibold text-stone-800">{value}</dd>
    </div>
  );
}
