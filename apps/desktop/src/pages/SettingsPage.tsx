import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";
import {
  activateProvider,
  checkProviderHealth,
  createProvider,
  deleteProvider,
  listProviders,
  updateProvider,
} from "../api/client";
import type {
  Provider,
  ProviderCreateRequest,
  ProviderHealthResponse,
  ProviderUpdateRequest,
} from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox } from "../components/FormFields";
import { Metric, Panel } from "../components/Panel";
import { ProviderFormModal } from "../components/ProviderFormModal";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";

type PageMode = "browse" | "editing" | "creating";

function chooseSelectedProviderId(providers: Provider[], preferredProviderId?: string | null): string | null {
  if (preferredProviderId && providers.some((provider) => provider.id === preferredProviderId)) {
    return preferredProviderId;
  }
  return providers.find((provider) => provider.is_active)?.id ?? providers[0]?.id ?? null;
}

export function SettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>("browse");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [activatingProviderId, setActivatingProviderId] = useState<string | null>(null);
  const [checkingProviderId, setCheckingProviderId] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<Record<string, ProviderHealthResponse>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;
  const activeProvider = providers.find((provider) => provider.is_active) ?? null;

  const loadProviderList = useCallback(async (preferredProviderId?: string | null, signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);
    setSubmitMessage(null);

    try {
      const loadedProviders = await listProviders({ signal });
      const nextSelectedProviderId = chooseSelectedProviderId(loadedProviders, preferredProviderId);
      setProviders(loadedProviders);
      setSelectedProviderId(nextSelectedProviderId);
      setLoadStatus("success");
    } catch (error) {
      if (isAbortError(error)) return;
      setLoadStatus("error");
      setLoadError(toErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadProviderList(null, controller.signal);
    return () => controller.abort();
  }, [loadProviderList]);

  function selectProvider(provider: Provider) {
    setSelectedProviderId(provider.id);
    setActionError(null);
  }

  function startEditing(provider: Provider) {
    setSelectedProviderId(provider.id);
    setPageMode("editing");
    setSaveError(null);
    setSubmitMessage(null);
  }

  function startCreating() {
    setSelectedProviderId(null);
    setPageMode("creating");
    setSaveError(null);
    setSubmitMessage(null);
  }

  function closeModal() {
    setPageMode("browse");
    setSaveError(null);
  }

  async function handleSave(payload: ProviderCreateRequest | ProviderUpdateRequest) {
    setSaving(true);
    setSaveError(null);

    try {
      const isEditing = pageMode === "editing" && selectedProvider;
      const saved = isEditing
        ? await updateProvider(selectedProvider.id, payload)
        : await createProvider(payload as ProviderCreateRequest);
      setSubmitMessage(isEditing ? "Provider saved." : "Provider created.");
      setPageMode("browse");
      await loadProviderList(saved.id);
    } catch (error) {
      setSaveError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function activateSelectedProvider(provider: Provider) {
    setActionError(null);
    setSubmitMessage(null);
    setActivatingProviderId(provider.id);

    try {
      const activatedProvider = await activateProvider(provider.id);
      await loadProviderList(activatedProvider.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setActivatingProviderId(null);
    }
  }

  async function runHealthCheck(provider: Provider) {
    setActionError(null);
    setCheckingProviderId(provider.id);

    try {
      const result = await checkProviderHealth(provider.id);
      setHealthResults((current) => ({ ...current, [provider.id]: result }));
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setCheckingProviderId(null);
    }
  }

  async function deleteSelectedProvider() {
    if (!selectedProvider) return;

    setActionError(null);
    setSubmitMessage(null);

    try {
      await deleteProvider(selectedProvider.id);
      setSubmitMessage("Provider deleted.");
      await loadProviderList(null);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Desktop">
        <div className="grid gap-3">
          <Metric label="API base URL" value={API_BASE_URL} />
          <Metric label="Providers" value={String(providers.length)} />
          <Metric label="Active provider" value={activeProvider?.name ?? "Unset"} />
        </div>
      </Panel>

      <Panel title="Providers">
        {submitMessage ? (
          <div className="mb-4 rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            {submitMessage}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void loadProviderList(selectedProviderId)}
            disabled={loadStatus === "loading"}
          >
            {loadStatus === "loading" ? "Loading..." : "Refresh"}
          </button>
          <button
            type="button"
            className="rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
            onClick={startCreating}
          >
            New Provider
          </button>
        </div>

        {loadStatus === "error" && loadError ? <ErrorBox message={loadError} /> : null}
        {actionError ? <ErrorBox message={actionError} /> : null}

        {loadStatus === "success" && providers.length === 0 ? (
          <EmptyState
            title="No providers yet."
            detail="Create an OpenAI-compatible provider to enable AI features."
          />
        ) : null}

        <div className="space-y-3">
          {providers.map((provider) => (
            <ProviderListItem
              key={provider.id}
              provider={provider}
              isSelected={provider.id === selectedProviderId}
              healthResult={healthResults[provider.id]}
              activating={activatingProviderId === provider.id}
              checking={checkingProviderId === provider.id}
              onSelect={selectProvider}
              onEdit={startEditing}
              onActivate={activateSelectedProvider}
              onHealthCheck={runHealthCheck}
              onDelete={(p) => {
                setSelectedProviderId(p.id);
                setShowDeleteConfirm(true);
              }}
            />
          ))}
        </div>
      </Panel>

      {(pageMode === "editing" || pageMode === "creating") && (
        <ProviderFormModal
          key={pageMode === "editing" ? selectedProviderId : "new"}
          mode={pageMode}
          provider={selectedProvider}
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
          onCancel={closeModal}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Provider"
        message={`Permanently delete "${selectedProvider?.name ?? "this provider"}"? This action cannot be undone.`}
        confirmLabel="Delete Provider"
        onConfirm={() => void deleteSelectedProvider()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function ProviderListItem({
  provider,
  isSelected,
  healthResult,
  activating,
  checking,
  onSelect,
  onEdit,
  onActivate,
  onHealthCheck,
  onDelete,
}: {
  provider: Provider;
  isSelected: boolean;
  healthResult: ProviderHealthResponse | undefined;
  activating: boolean;
  checking: boolean;
  onSelect: (provider: Provider) => void;
  onEdit: (provider: Provider) => void;
  onActivate: (provider: Provider) => void;
  onHealthCheck: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-white p-3 transition",
        isSelected ? "border-pine shadow-sm" : "border-stone-200",
      ].join(" ")}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect(provider)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{provider.name}</p>
            <p className="mt-1 break-all text-xs text-stone-600">{provider.base_url}</p>
          </div>
          {provider.is_active ? (
            <span className="shrink-0 rounded-full bg-pine/10 px-2 py-1 text-xs font-semibold text-pine">
              Active
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
              Idle
            </span>
          )}
        </div>
        <dl className="mt-3 grid gap-2 text-xs text-stone-600">
          <div className="flex justify-between gap-3">
            <dt>Chat</dt>
            <dd className="truncate font-semibold text-stone-800">{provider.chat_model}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Embedding</dt>
            <dd className="truncate font-semibold text-stone-800">{provider.embedding_model}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>API key</dt>
            <dd className="font-semibold text-stone-800">
              {provider.has_api_key ? "Stored" : "Missing"}
            </dd>
          </div>
        </dl>
      </button>

      {healthResult ? (
        <div
          className={[
            "mt-3 rounded-lg border px-3 py-2 text-xs",
            healthResult.status === "ok"
              ? "border-pine/20 bg-pine/10 text-pine"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          <p className="font-semibold">
            {healthResult.status === "ok" ? "Reachable" : "Error"}
          </p>
          <p className="mt-1">{formatHealthMessage(healthResult)}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!provider.is_active ? (
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onActivate(provider)}
            disabled={activating}
          >
            {activating ? "Activating..." : "Activate"}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onHealthCheck(provider)}
          disabled={checking}
        >
          {checking ? "Checking..." : "Health Check"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
          onClick={() => onEdit(provider)}
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
          onClick={() => onDelete(provider)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function formatHealthMessage(result: ProviderHealthResponse): string {
  if (result.latency_ms === null) return result.message;
  return `${result.message} ${result.latency_ms} ms`;
}
