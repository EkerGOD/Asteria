import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listModelRoles,
  listProviders,
  upsertModelRole,
} from "../api/client";
import type {
  ModelRoleUpsertRequest,
  Provider,
} from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox } from "../components/FormFields";
import { Panel } from "../components/Panel";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";
import { inputClassName } from "../lib/style";
import { providerModelNames } from "../lib/provider";

type ProviderModelOption = {
  value: string;
  provider_id: string;
  provider_name: string;
  model_name: string;
};

const LOCAL_EMBEDDING_DEFAULT = "bge-m3";
const LOCAL_EMBEDDING_DIMENSION_DEFAULT = "1024";
const OPTION_SEPARATOR = "\u001f";

function optionValue(providerId: string, modelName: string): string {
  return `${providerId}${OPTION_SEPARATOR}${modelName}`;
}

function providerModelOptions(providers: Provider[]): ProviderModelOption[] {
  return providers.flatMap((provider) => {
    const modelNames = providerModelNames(provider);

    return modelNames.map((modelName) => ({
      value: optionValue(provider.id, modelName),
      provider_id: provider.id,
      provider_name: provider.name,
      model_name: modelName,
    }));
  });
}

export function ModelRolesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chatProviderId, setChatProviderId] = useState<string | null>(null);
  const [chatModel, setChatModel] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState(LOCAL_EMBEDDING_DEFAULT);
  const [embeddingDimension, setEmbeddingDimension] = useState(
    LOCAL_EMBEDDING_DIMENSION_DEFAULT,
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const availableModels = useMemo(() => providerModelOptions(providers), [providers]);
  const selectedChatOption = chatProviderId
    ? optionValue(chatProviderId, chatModel)
    : "";

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const [loadedProviders, loadedRoles] = await Promise.all([
        listProviders({ signal }),
        listModelRoles({ signal }),
      ]);
      const nextOptions = providerModelOptions(loadedProviders);
      const chatRole = loadedRoles.find((role) => role.role_type === "chat");
      const embeddingRole = loadedRoles.find((role) => role.role_type === "embedding");
      const chatRoleOption =
        chatRole?.provider_id
          ? nextOptions.find(
              (option) =>
                option.provider_id === chatRole.provider_id &&
                option.model_name === chatRole.model_name,
            )
          : null;
      const fallbackChatOption = chatRoleOption ?? nextOptions[0] ?? null;

      setProviders(loadedProviders);
      setChatProviderId(fallbackChatOption?.provider_id ?? null);
      setChatModel(fallbackChatOption?.model_name ?? "");

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
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleChatSelection = (value: string) => {
    const option = availableModels.find((item) => item.value === value);
    setChatProviderId(option?.provider_id ?? null);
    setChatModel(option?.model_name ?? "");
  };

  const handleSave = async (roleType: "chat" | "embedding") => {
    setSaving(roleType);
    setSaveError(null);
    setSaveMessage(null);

    const payload = buildRolePayload(
      roleType,
      chatProviderId,
      chatModel,
      embeddingModel,
      embeddingDimension,
    );

    if (!payload) {
      setSaveError(
        roleType === "chat"
          ? "Select a provider model before saving."
          : "Local embedding model name is required.",
      );
      setSaving(null);
      return;
    }

    try {
      await upsertModelRole(roleType, payload);
      setSaveMessage(`${roleType === "chat" ? "Chat" : "Embedding"} role saved.`);
    } catch (error) {
      setSaveError(toErrorMessage(error));
    } finally {
      setSaving(null);
    }
  };

  if (loadStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-stone-500">
        Loading...
      </div>
    );
  }

  if (loadStatus === "error") {
    return <ErrorBox message={loadError ?? "Failed to load data."} />;
  }

  return (
    <div className="space-y-4">
      {saveMessage && (
        <div className="rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
          {saveMessage}
        </div>
      )}
      {saveError && <ErrorBox message={saveError} />}

      {providers.length === 0 && (
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
              onChange={(event) => handleChatSelection(event.target.value)}
              disabled={availableModels.length === 0}
            >
              {availableModels.length === 0 ? (
                <option value="">No provider models available</option>
              ) : null}
              {availableModels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.model_name} ({option.provider_name})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSave("chat")}
            disabled={saving !== null || availableModels.length === 0}
          >
            {saving === "chat" ? "Saving..." : "Save Chat Role"}
          </button>
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
            onClick={() => void handleSave("embedding")}
            disabled={saving !== null}
          >
            {saving === "embedding" ? "Saving..." : "Save Embedding Role"}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function buildRolePayload(
  roleType: "chat" | "embedding",
  chatProviderId: string | null,
  chatModel: string,
  embeddingModel: string,
  embeddingDimension: string,
): ModelRoleUpsertRequest | null {
  if (roleType === "chat") {
    if (!chatProviderId || !chatModel.trim()) {
      return null;
    }
    return {
      provider_id: chatProviderId,
      model_name: chatModel.trim(),
    };
  }

  const modelName = embeddingModel.trim();
  if (!modelName) {
    return null;
  }
  return {
    provider_id: null,
    model_name: modelName,
    embedding_dimension: Number(embeddingDimension) || null,
  };
}
