import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Provider, ProviderCreateRequest, ProviderUpdateRequest } from "../api/types";
import { providerModelNames } from "../lib/provider";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorBox, NumberField, PasswordField, TextField } from "./FormFields";
import { Icon } from "./Icon";

type ProviderFormState = {
  name: string;
  base_url: string;
  api_key: string;
  models: string[];
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
    models: [""],
    timeout_seconds: DEFAULT_TIMEOUT_SECONDS,
    is_active: false,
    clear_api_key: false,
  };
}

function createFormFromProvider(provider: Provider): ProviderFormState {
  const names = providerModelNames(provider);
  return {
    name: provider.name,
    base_url: provider.base_url,
    api_key: "",
    models: names.length > 0 ? names : [provider.chat_model],
    timeout_seconds: String(provider.timeout_seconds),
    is_active: provider.is_active,
    clear_api_key: false,
  };
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
  if (normalizedModelNames(form.models).length === 0) {
    errors.models = "At least one model is required.";
  }
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 300) {
    errors.timeout_seconds = "Timeout must be an integer from 1 to 300.";
  }

  return errors;
}

function normalizedModelNames(models: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  models.forEach((model) => {
    const name = model.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(name);
  });
  return normalized;
}

function buildProviderPayload(
  form: ProviderFormState,
  selectedProvider: Provider | null,
): ProviderCreateRequest | ProviderUpdateRequest {
  const payload: ProviderCreateRequest | ProviderUpdateRequest = {
    name: form.name.trim(),
    base_url: form.base_url.trim(),
    models: normalizedModelNames(form.models),
    timeout_seconds: Number(form.timeout_seconds),
    is_active: form.is_active,
  };

  const apiKey = form.api_key.trim();
  if (apiKey) {
    payload.api_key = apiKey;
  } else if (selectedProvider && form.clear_api_key) {
    payload.api_key = "";
  }

  return payload;
}

type ProviderFormModalProps = {
  mode: "editing" | "creating";
  provider: Provider | null;
  saving: boolean;
  saveError: string | null;
  onSave: (payload: ProviderCreateRequest | ProviderUpdateRequest) => Promise<void>;
  onCancel: () => void;
};

export function ProviderFormModal({
  mode,
  provider,
  saving,
  saveError,
  onSave,
  onCancel,
}: ProviderFormModalProps) {
  const [form, setForm] = useState<ProviderFormState>(() =>
    mode === "editing" && provider ? createFormFromProvider(provider) : createEmptyForm(),
  );
  const [formErrors, setFormErrors] = useState<ProviderFormErrors>({});
  const [showClearKeyConfirm, setShowClearKeyConfirm] = useState(false);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const updateFormField = useCallback(
    <K extends keyof ProviderFormState>(field: K, value: ProviderFormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
      setFormErrors((current) => ({ ...current, [field]: undefined }));
    },
    [],
  );

  const updateModelName = useCallback((index: number, value: string) => {
    setForm((current) => ({
      ...current,
      models: current.models.map((model, modelIndex) =>
        modelIndex === index ? value : model,
      ),
    }));
    setFormErrors((current) => ({ ...current, models: undefined }));
  }, []);

  const addModelName = useCallback(() => {
    setForm((current) => ({ ...current, models: [...current.models, ""] }));
    setFormErrors((current) => ({ ...current, models: undefined }));
  }, []);

  const removeModelName = useCallback((index: number) => {
    setForm((current) => {
      if (current.models.length === 1) {
        return current;
      }
      return {
        ...current,
        models: current.models.filter((_, modelIndex) => modelIndex !== index),
      };
    });
    setFormErrors((current) => ({ ...current, models: undefined }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const validationErrors = validateForm(form);
      setFormErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;

      const payload = buildProviderPayload(form, provider);
      await onSave(payload);
    },
    [form, provider, onSave],
  );

  const title = mode === "editing" ? "Edit Provider" : "New Provider";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/20"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-stone-300 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-200 px-6 py-4">
          <h3 className="flex-1 text-base font-semibold">{title}</h3>
          <button
            type="button"
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            onClick={onCancel}
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="overflow-auto px-6 py-4" style={{ maxHeight: "calc(90vh - 8rem)" }}>
          <form className="space-y-4" onSubmit={handleSubmit}>
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

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label
                  htmlFor="provider-model-0"
                  className="text-sm font-medium text-stone-700"
                >
                  Models
                </label>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/35"
                  onClick={addModelName}
                  aria-label="Add model"
                  title="Add model"
                >
                  <Icon name="add" size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {form.models.map((modelName, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      id={`provider-model-${index}`}
                      type="text"
                      className={[
                        "min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-1",
                        formErrors.models
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-stone-300 focus:border-pine focus:ring-pine",
                      ].join(" ")}
                      value={modelName}
                      placeholder="e.g. deepseek-v4-pro"
                      onChange={(event) => updateModelName(index, event.target.value)}
                    />
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => removeModelName(index)}
                      disabled={form.models.length === 1}
                      aria-label={`Remove model ${index + 1}`}
                      title="Remove model"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {formErrors.models ? (
                <p className="mt-1 text-xs font-medium text-red-700">{formErrors.models}</p>
              ) : null}
            </div>

            <PasswordField
              id="provider-api-key"
              label="API key"
              value={form.api_key}
              placeholder={provider?.has_api_key ? "Stored key remains unchanged" : "Optional"}
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

              {provider?.has_api_key ? (
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-pine focus:ring-pine"
                    checked={form.clear_api_key}
                    disabled={Boolean(form.api_key.trim())}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setShowClearKeyConfirm(true);
                      } else {
                        updateFormField("clear_api_key", false);
                      }
                    }}
                  />
                  Clear stored key
                </label>
              ) : null}
            </div>

            {saveError ? <ErrorBox message={saveError} /> : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Provider"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={showClearKeyConfirm}
        title="Clear Stored Key"
        message="This will permanently clear the stored API key for this provider. The key cannot be recovered."
        confirmLabel="Clear Key"
        onConfirm={() => {
          setShowClearKeyConfirm(false);
          updateFormField("clear_api_key", true);
        }}
        onCancel={() => setShowClearKeyConfirm(false)}
      />
    </div>
  );
}
