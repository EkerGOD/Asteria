import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_BASE_URL } from "../api/config";
import {
  activateProvider,
  checkProviderHealth,
  createProvider,
  listProviders,
  updateProvider
} from "../api/client";
import type {
  Provider,
  ProviderCreateRequest,
  ProviderHealthResponse,
  ProviderUpdateRequest
} from "../api/types";
import { Metric, Panel } from "../components/Panel";

type LoadStatus = "loading" | "success" | "error";

type ProviderFormState = {
  name: string;
  base_url: string;
  api_key: string;
  chat_model: string;
  embedding_model: string;
  timeout_seconds: string;
  is_active: boolean;
  clear_api_key: boolean;
};

type ProviderFormErrors = Partial<Record<keyof ProviderFormState, string>>;

const DEFAULT_TIMEOUT_SECONDS = "60";

function createEmptyForm(): ProviderFormState {
  return {
    name: "",
    base_url: "",
    api_key: "",
    chat_model: "",
    embedding_model: "",
    timeout_seconds: DEFAULT_TIMEOUT_SECONDS,
    is_active: false,
    clear_api_key: false
  };
}

function createFormFromProvider(provider: Provider): ProviderFormState {
  return {
    name: provider.name,
    base_url: provider.base_url,
    api_key: "",
    chat_model: provider.chat_model,
    embedding_model: provider.embedding_model,
    timeout_seconds: String(provider.timeout_seconds),
    is_active: provider.is_active,
    clear_api_key: false
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Provider request failed.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function chooseSelectedProviderId(providers: Provider[], preferredProviderId?: string | null): string | null {
  if (preferredProviderId && providers.some((provider) => provider.id === preferredProviderId)) {
    return preferredProviderId;
  }

  return providers.find((provider) => provider.is_active)?.id ?? providers[0]?.id ?? null;
}

function validateForm(form: ProviderFormState): ProviderFormErrors {
  const errors: ProviderFormErrors = {};
  const timeoutSeconds = Number(form.timeout_seconds);

  if (!form.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!form.base_url.trim()) {
    errors.base_url = "Base URL is required.";
  }

  if (!form.chat_model.trim()) {
    errors.chat_model = "Chat model is required.";
  }

  if (!form.embedding_model.trim()) {
    errors.embedding_model = "Embedding model is required.";
  }

  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 300) {
    errors.timeout_seconds = "Timeout must be an integer from 1 to 300.";
  }

  return errors;
}

function buildProviderPayload(form: ProviderFormState, selectedProvider: Provider | null) {
  const payload: ProviderCreateRequest | ProviderUpdateRequest = {
    name: form.name.trim(),
    base_url: form.base_url.trim(),
    chat_model: form.chat_model.trim(),
    embedding_model: form.embedding_model.trim(),
    timeout_seconds: Number(form.timeout_seconds),
    is_active: form.is_active
  };

  const apiKey = form.api_key.trim();

  if (apiKey) {
    payload.api_key = apiKey;
  } else if (selectedProvider && form.clear_api_key) {
    payload.api_key = "";
  }

  return payload;
}

export function SettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderFormState>(() => createEmptyForm());
  const [formErrors, setFormErrors] = useState<ProviderFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activatingProviderId, setActivatingProviderId] = useState<string | null>(null);
  const [checkingProviderId, setCheckingProviderId] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<Record<string, ProviderHealthResponse>>({});

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId]
  );
  const activeProvider = providers.find((provider) => provider.is_active) ?? null;

  const loadProviderList = useCallback(async (preferredProviderId?: string | null, signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);

    try {
      const loadedProviders = await listProviders({ signal });
      const nextSelectedProviderId = chooseSelectedProviderId(loadedProviders, preferredProviderId);
      const nextSelectedProvider =
        loadedProviders.find((provider) => provider.id === nextSelectedProviderId) ?? null;

      setProviders(loadedProviders);
      setSelectedProviderId(nextSelectedProviderId);
      setForm(nextSelectedProvider ? createFormFromProvider(nextSelectedProvider) : createEmptyForm());
      setFormErrors({});
      setSubmitError(null);
      setLoadStatus("success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

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
    setForm(createFormFromProvider(provider));
    setFormErrors({});
    setSubmitError(null);
    setSubmitMessage(null);
  }

  function startNewProvider() {
    setSelectedProviderId(null);
    setForm(createEmptyForm());
    setFormErrors({});
    setSubmitError(null);
    setSubmitMessage(null);
  }

  function updateFormField<K extends keyof ProviderFormState>(field: K, value: ProviderFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setFormErrors((current) => ({
      ...current,
      [field]: undefined
    }));
    setSubmitMessage(null);
  }

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitMessage(null);
    setActionError(null);

    const validationErrors = validateForm(form);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      const payload = buildProviderPayload(form, selectedProvider);
      const savedProvider = selectedProvider
        ? await updateProvider(selectedProvider.id, payload)
        : await createProvider(payload as ProviderCreateRequest);

      setSubmitMessage("Provider saved.");
      await loadProviderList(savedProvider.id);
    } catch (error) {
      setSubmitError(toErrorMessage(error));
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
      setHealthResults((current) => ({
        ...current,
        [provider.id]: result
      }));
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setCheckingProviderId(null);
    }
  }

  const formTitle = selectedProvider ? "Edit Provider" : "New Provider";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <Panel title="Providers">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
              onClick={() => void loadProviderList(selectedProviderId)}
              disabled={loadStatus === "loading"}
            >
              {loadStatus === "loading" ? "Loading..." : "Refresh"}
            </button>
            <button
              type="button"
              className="rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
              onClick={startNewProvider}
            >
              New
            </button>
          </div>

          {loadStatus === "error" && loadError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          ) : null}

          {actionError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </div>
          ) : null}

          {loadStatus === "success" && providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-600">
              No providers yet.
            </div>
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
                onActivate={activateSelectedProvider}
                onHealthCheck={runHealthCheck}
              />
            ))}
          </div>
        </Panel>

        <Panel title={formTitle}>
          <form className="space-y-4" onSubmit={saveProvider}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                id="provider-name"
                label="Name"
                value={form.name}
                error={formErrors.name}
                required
                onChange={(value) => updateFormField("name", value)}
              />
              <NumberField
                id="provider-timeout"
                label="Timeout seconds"
                value={form.timeout_seconds}
                error={formErrors.timeout_seconds}
                min={1}
                max={300}
                required
                onChange={(value) => updateFormField("timeout_seconds", value)}
              />
            </div>

            <TextField
              id="provider-base-url"
              label="Base URL"
              value={form.base_url}
              error={formErrors.base_url}
              required
              onChange={(value) => updateFormField("base_url", value)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                id="provider-chat-model"
                label="Chat model"
                value={form.chat_model}
                error={formErrors.chat_model}
                required
                onChange={(value) => updateFormField("chat_model", value)}
              />
              <TextField
                id="provider-embedding-model"
                label="Embedding model"
                value={form.embedding_model}
                error={formErrors.embedding_model}
                required
                onChange={(value) => updateFormField("embedding_model", value)}
              />
            </div>

            <PasswordField
              id="provider-api-key"
              label="API key"
              value={form.api_key}
              placeholder={selectedProvider?.has_api_key ? "Stored key remains unchanged" : "Optional"}
              onChange={(value) => {
                updateFormField("api_key", value);
                if (value.trim()) {
                  updateFormField("clear_api_key", false);
                }
              }}
            />

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-pine focus:ring-pine"
                  checked={form.is_active}
                  onChange={(event) => updateFormField("is_active", event.target.checked)}
                />
                Active provider
              </label>

              {selectedProvider?.has_api_key ? (
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-pine focus:ring-pine"
                    checked={form.clear_api_key}
                    disabled={Boolean(form.api_key.trim())}
                    onChange={(event) => updateFormField("clear_api_key", event.target.checked)}
                  />
                  Clear stored key
                </label>
              ) : null}
            </div>

            {submitError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {submitError}
              </div>
            ) : null}

            {submitMessage ? (
              <div className="rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
                {submitMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Provider"}
              </button>

              {selectedProvider && !selectedProvider.is_active ? (
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void activateSelectedProvider(selectedProvider)}
                  disabled={activatingProviderId === selectedProvider.id}
                >
                  {activatingProviderId === selectedProvider.id ? "Activating..." : "Activate"}
                </button>
              ) : null}

              {selectedProvider ? (
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void runHealthCheck(selectedProvider)}
                  disabled={checkingProviderId === selectedProvider.id}
                >
                  {checkingProviderId === selectedProvider.id ? "Checking..." : "Health Check"}
                </button>
              ) : null}
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Desktop">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="API base URL" value={API_BASE_URL} />
          <Metric label="Providers" value={String(providers.length)} />
          <Metric label="Active provider" value={activeProvider?.name ?? "Unset"} />
        </div>
      </Panel>
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
  onActivate,
  onHealthCheck
}: {
  provider: Provider;
  isSelected: boolean;
  healthResult: ProviderHealthResponse | undefined;
  activating: boolean;
  checking: boolean;
  onSelect: (provider: Provider) => void;
  onActivate: (provider: Provider) => void;
  onHealthCheck: (provider: Provider) => void;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-white p-3 transition",
        isSelected ? "border-pine shadow-sm" : "border-stone-200"
      ].join(" ")}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect(provider)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{provider.name}</p>
            <p className="mt-1 break-all text-xs text-stone-600">{provider.base_url}</p>
          </div>
          {provider.is_active ? (
            <span className="rounded-full bg-pine/10 px-2 py-1 text-xs font-semibold text-pine">Active</span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">Idle</span>
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
            <dd className="font-semibold text-stone-800">{provider.has_api_key ? "Stored" : "Missing"}</dd>
          </div>
        </dl>
      </button>

      {healthResult ? (
        <div
          className={[
            "mt-3 rounded-lg border px-3 py-2 text-xs",
            healthResult.status === "ok"
              ? "border-pine/20 bg-pine/10 text-pine"
              : "border-red-200 bg-red-50 text-red-800"
          ].join(" ")}
        >
          <p className="font-semibold">{healthResult.status === "ok" ? "Reachable" : "Error"}</p>
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
      </div>
    </div>
  );
}

function formatHealthMessage(result: ProviderHealthResponse): string {
  if (result.latency_ms === null) {
    return result.message;
  }

  return `${result.message} ${result.latency_ms} ms`;
}

function TextField({
  id,
  label,
  value,
  error,
  required,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={inputClassName(error)}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError error={error} />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  placeholder,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type="password"
        className={inputClassName()}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  error,
  min,
  max,
  required,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  min: number;
  max: number;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={inputClassName(error)}
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-red-700">{error}</p>;
}

function inputClassName(error?: string): string {
  return [
    "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink outline-none transition",
    "focus:border-pine focus:ring-2 focus:ring-pine/20",
    error ? "border-red-300" : "border-stone-300"
  ].join(" ");
}
