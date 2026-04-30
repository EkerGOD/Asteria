import { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadLocalModel,
  listLocalModels,
  listModelRoles,
  upsertModelRole,
} from "../api/client";
import type {
  LocalModelItem,
  LocalModelsResponse,
  ModelRoleUpsertRequest,
} from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox } from "../components/FormFields";
import { Panel } from "../components/Panel";
import { useModelRole } from "../contexts/ModelRoleContext";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";
import { inputClassName } from "../lib/style";

const OPTION_SEPARATOR = "\x1f";
const POLL_INTERVAL_MS = 2000;

function optionValue(providerId: string, modelName: string): string {
  return `${providerId}${OPTION_SEPARATOR}${modelName}`;
}

function statusBadge(status: LocalModelItem["status"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "downloaded":
      return <span className={`${base} bg-pine/10 text-pine`}>Downloaded</span>;
    case "downloading":
      return <span className={`${base} bg-amber/10 text-amber-700`}>Downloading</span>;
    case "failed":
      return <span className={`${base} bg-red/10 text-red-700`}>Failed</span>;
    default:
      return <span className={`${base} bg-stone-100 text-stone-600`}>Not downloaded</span>;
  }
}

export function ModelRolesPage() {
  const ctx = useModelRole();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [localModels, setLocalModels] = useState<LocalModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [embeddingDimension, setEmbeddingDimension] = useState("1024");
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedChatOption = ctx.chatProviderId
    ? optionValue(ctx.chatProviderId, ctx.chatModel)
    : "";

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const [roles, local] = await Promise.all([
        listModelRoles({ signal }),
        listLocalModels({ signal }),
      ]);
      const embeddingRole = roles.find((role) => role.role_type === "embedding");
      if (embeddingRole) {
        setSelectedModel(embeddingRole.model_name);
        if (embeddingRole.embedding_dimension) {
          setEmbeddingDimension(String(embeddingRole.embedding_dimension));
        }
      } else if (local.models.length > 0) {
        setSelectedModel(local.models[0].name);
        setEmbeddingDimension(String(local.models[0].dimension));
      }
      setLocalModels(local.models);
      setLoadStatus("success");
    } catch (error) {
      if (isAbortError(error)) return;
      setLoadStatus("error");
      setLoadError(toErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleChatChange = (value: string) => {
    const parts = value.split(OPTION_SEPARATOR);
    if (parts.length === 2) {
      void ctx.setChatModel(parts[0], parts[1]);
    }
  };

  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName);
    setSaveMessage(null);
    setSaveError(null);
    const model = localModels.find((m) => m.name === modelName);
    if (model) {
      setEmbeddingDimension(String(model.dimension));
    }
  };

  const handleDownload = async (modelName: string) => {
    setDownloadingModel(modelName);
    setDownloadError(null);
    try {
      await downloadLocalModel(modelName);
      pollDownloadProgress(modelName);
    } catch (error) {
      setDownloadingModel(null);
      setDownloadError(`Failed to start download: ${toErrorMessage(error)}`);
    }
  };

  const pollDownloadProgress = (modelName: string) => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
    }
    pollRef.current = setInterval(async () => {
      try {
        const response: LocalModelsResponse = await listLocalModels();
        setLocalModels(response.models);
        const model = response.models.find((m) => m.name === modelName);
        if (!model || model.status === "downloaded" || model.status === "failed") {
          if (pollRef.current !== null) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setDownloadingModel(null);
          if (model?.status === "failed") {
            setDownloadError(model.error_message ?? "Download failed.");
          }
        }
      } catch {
        // Silently retry on next poll
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSaveEmbedding = async () => {
    if (!selectedModel) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const selected = localModels.find((m) => m.name === selectedModel);
    const dimension = selected?.dimension ?? (Number(embeddingDimension) || 1024);
    const payload: ModelRoleUpsertRequest = {
      provider_id: null,
      model_name: selectedModel,
      embedding_dimension: dimension,
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

  const isDownloading = downloadingModel !== null;

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
                <option
                  key={optionValue(m.provider_id, m.model_name)}
                  value={optionValue(m.provider_id, m.model_name)}
                >
                  {m.model_name} ({m.provider_name})
                </option>
              ))}
            </select>
            {!ctx.chatModel && ctx.availableModels.length > 0 && (
              <p className="mt-1 text-xs text-stone-500">
                Select a model to use for chat.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Local Embedding Model Role">
        <div className="space-y-3">
          {localModels.length === 0 ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">
              No local embedding models available.
            </div>
          ) : (
            <div className="space-y-2">
              {localModels.map((model) => {
                const isSelected = selectedModel === model.name;
                const isThisDownloading =
                  downloadingModel === model.name && model.status === "downloading";

                return (
                  <button
                    key={model.name}
                    type="button"
                    onClick={() => handleSelectModel(model.name)}
                    disabled={isDownloading}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? "border-pine bg-pine/5 ring-1 ring-pine/30"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    } ${isDownloading ? "cursor-wait" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-800">
                            {model.name}
                          </span>
                          <span className="text-xs text-stone-500">
                            {model.dimension}-dim
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {model.description}
                        </p>
                        {model.local_path && (
                          <p className="mt-0.5 truncate text-xs text-stone-400">
                            {model.local_path}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {statusBadge(model.status)}
                        {model.status === "not_downloaded" && !isDownloading && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload(model.name);
                            }}
                            className="rounded-md bg-pine px-2.5 py-1 text-xs font-medium text-white transition hover:bg-pine/90"
                          >
                            Download
                          </button>
                        )}
                        {model.status === "failed" && !isDownloading && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload(model.name);
                            }}
                            className="rounded-md bg-pine px-2.5 py-1 text-xs font-medium text-white transition hover:bg-pine/90"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                    {isThisDownloading && model.progress != null && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full rounded-full bg-pine transition-all duration-300"
                            style={{ width: `${model.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          Downloading... {model.progress}%
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {downloadError && (
            <ErrorBox message={downloadError} />
          )}

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
            <p className="mt-1 text-xs text-stone-500">
              Auto-filled from the selected model. Override if needed.
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSaveEmbedding()}
            disabled={saving || !selectedModel || isDownloading}
          >
            {saving ? "Saving..." : "Save Embedding Role"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
