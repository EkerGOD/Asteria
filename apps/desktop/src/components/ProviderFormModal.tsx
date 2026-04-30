import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Provider, ProviderCreateRequest, ProviderUpdateRequest } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorBox, NumberField, PasswordField, TextField } from "./FormFields";
import { Icon } from "./Icon";

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
    clear_api_key: false,
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

function buildProviderPayload(
  form: ProviderFormState,
  selectedProvider: Provider | null,
): ProviderCreateRequest | ProviderUpdateRequest {
  const payload: ProviderCreateRequest | ProviderUpdateRequest = {
    name: form.name.trim(),
    base_url: form.base_url.trim(),
    chat_model: form.chat_model.trim(),
    embedding_model: form.embedding_model.trim(),
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
