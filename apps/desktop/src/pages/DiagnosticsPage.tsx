import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";
import { checkProviderHealth, listProviders } from "../api/client";
import type { ProviderHealthResponse } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox } from "../components/FormFields";
import { Panel } from "../components/Panel";
import { useApiHealth } from "../hooks/useApiHealth";
import { isAbortError, toErrorMessage } from "../lib/errors";

type ProviderStatusState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; providerName: string; isActive: boolean; health: ProviderHealthResponse | null }
  | { status: "error"; message: string };

export function DiagnosticsPage({ onNavigateToSettings }: { onNavigateToSettings?: () => void }) {
  const apiHealth = useApiHealth();
  const [providerStatus, setProviderStatus] = useState<ProviderStatusState>({ status: "idle" });

  const checkProvider = useCallback(async (signal?: AbortSignal) => {
    setProviderStatus({ status: "loading" });

    try {
      const providers = await listProviders({ signal });
      const activeProvider = providers.find((p) => p.is_active);

      if (!activeProvider) {
        setProviderStatus({
          status: "success",
          providerName: "Unset",
          isActive: false,
          health: null,
        });
        return;
      }

      try {
        const health = await checkProviderHealth(activeProvider.id);
        setProviderStatus({ status: "success", providerName: activeProvider.name, isActive: true, health });
      } catch {
        setProviderStatus({
          status: "success",
          providerName: activeProvider.name,
          isActive: true,
          health: {
            provider_id: activeProvider.id,
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
          : providerStatus.health?.status === "ok"
            ? `${providerStatus.providerName} reachable`
            : providerStatus.isActive
              ? `${providerStatus.providerName} unreachable`
              : "No active provider";

  const providerState: StatusState =
    providerStatus.status === "loading"
      ? "loading"
      : providerStatus.status === "error"
        ? "error"
        : providerStatus.status === "idle"
          ? "idle"
          : providerStatus.isActive && providerStatus.health?.status === "ok"
            ? "success"
            : providerStatus.isActive
              ? "error"
              : "idle";

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
        <DiagnosticSection title="Local API" badge={stateBadge(apiHealth.status)}>
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
        <DiagnosticSection title="Database" badge={stateBadge(databaseState)}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{databaseValue}</p>
            <StatusBadge state={databaseState} />
          </div>
        </DiagnosticSection>

        {/* Provider */}
        <DiagnosticSection title="AI Provider" badge={stateBadge(providerState)}>
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

          {providerStatus.status === "success" && !providerStatus.isActive && (
            <div className="mt-3">
              <EmptyState
                title="No active provider configured."
                detail="Configure and activate an OpenAI-compatible provider to enable chat and embeddings."
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

function stateBadge(state: StatusState): string {
  return {
    idle: "Pending",
    loading: "Checking",
    success: "Online",
    error: "Error",
  }[state];
}

function DiagnosticSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
          {badge}
        </span>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-xs font-semibold text-stone-800">{value}</dd>
    </div>
  );
}
