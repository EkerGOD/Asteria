import { useCallback, useEffect, useState } from "react";
import { listModelRoles, upsertModelRole } from "../api/client";
import type { ModelRoleUpsertRequest } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox } from "../components/FormFields";
import { Panel } from "../components/Panel";
import { useModelRole } from "../contexts/ModelRoleContext";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";
import { inputClassName } from "../lib/style";

const LOCAL_EMBEDDING_DEFAULT = "bge-m3";
const LOCAL_EMBEDDING_DIMENSION_DEFAULT = "1024";
const OPTION_SEPARATOR = "\x1f";

function optionValue(providerId: string, modelName: string): string {
  return `${providerId}${OPTION_SEPARATOR}${modelName}`;
}

export function ModelRolesPage() {
  const ctx = useModelRole();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [embeddingModel, setEmbeddingModel] = useState(LOCAL_EMBEDDING_DEFAULT);
  const [embeddingDimension, setEmbeddingDimension] = useState(
    LOCAL_EMBEDDING_DIMENSION_DEFAULT,
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const selectedChatOption = ctx.chatProviderId
    ? optionValue(ctx.chatProviderId, ctx.chatModel)
    : "";

  const loadEmbeddingRole = useCallback(async (signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const roles = await listModelRoles({ signal });
      const embeddingRole = roles.find((role) => role.role_type === "embedding");
      if (embeddingRole) {
        setEmbeddingModel(embeddingRole.model_name);
        if (embeddingRole.embedding_dimension) {
          setEmbeddingDimension(String(embeddingRole.embedding_dimension));
        }
      }
      setLoadStatus("success");
    } catch (error) {
      if (isAbortError(error)) return;
      setLoadStatus("error");
      setLoadError(toErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadEmbeddingRole(controller.signal);
    return () => controller.abort();
  }, [loadEmbeddingRole]);

  const handleChatChange = (value: string) => {
    const parts = value.split(OPTION_SEPARATOR);
    if (parts.length === 2) {
      void ctx.setChatModel(parts[0], parts[1]);
    }
  };

  const handleSaveEmbedding = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const modelName = embeddingModel.trim();
    if (!modelName) {
      setSaveError("Local embedding model name is required.");
      setSaving(false);
      return;
    }

    const payload: ModelRoleUpsertRequest = {
      provider_id: null,
      model_name: modelName,
      embedding_dimension: Number(embeddingDimension) || null,
    };

    try {
      await upsertModelRole("embedding", payload);
      setSaveMessage("Embedding role saved.");
    } catch (error) {
      setSaveError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (ctx.isLoading || loadStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-stone-500">
        Loading...
      </div>
    );
  }

  if (ctx.error || loadStatus === "error") {
    return <ErrorBox message={ctx.error ?? loadError ?? "Failed to load data."} />;
  }

  return (
    <div className="space-y-4">
      {saveMessage && (
        <div className="rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
          {saveMessage}
        </div>
      )}
      {saveError && <ErrorBox message={saveError} />}

      {ctx.availableModels.length === 0 && (
        <EmptyState
          title="No providers configured."
          detail="Add a provider in the Providers tab before configuring chat."
        />
      )}

      <Panel title="Chat Model Role">
        <div className="space-y-3">
          <div>
            <label
              htmlFor="chat-provider-model"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Model
            </label>
            <select
              id="chat-provider-model"
              className={inputClassName()}
              value={selectedChatOption}
              onChange={(event) => handleChatChange(event.target.value)}
              disabled={ctx.availableModels.length === 0}
            >
              {ctx.availableModels.length === 0 ? (
                <option value="">No provider models available</option>
              ) : null}
              {ctx.availableModels.map((m) => (
                <option key={optionValue(m.provider_id, m.model_name)} value={optionValue(m.provider_id, m.model_name)}>
                  {m.model_name} ({m.provider_name})
                </option>
              ))}
            </select>
            {!ctx.chatModel && ctx.availableModels.length > 0 && (
              <p className="mt-1 text-xs text-stone-500">Select a model to use for chat.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Local Embedding Model Role">
        <div className="space-y-3">
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
            Local embedding execution is not enabled yet.
          </div>
          <div>
            <label
              htmlFor="embedding-model"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Local model
            </label>
            <input
              id="embedding-model"
              type="text"
              className={inputClassName()}
              value={embeddingModel}
              onChange={(event) => setEmbeddingModel(event.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="embedding-dimension"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Embedding dimension
            </label>
            <input
              id="embedding-dimension"
              type="number"
              className={inputClassName()}
              min={1}
              max={8192}
              value={embeddingDimension}
              onChange={(event) => setEmbeddingDimension(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSaveEmbedding()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Embedding Role"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
