import { useCallback, useEffect, useState } from "react";
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

export function ModelRolesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chatProviderId, setChatProviderId] = useState<string | null>(null);
  const [chatModel, setChatModel] = useState("");
  const [embeddingProviderId, setEmbeddingProviderId] = useState<string | null>(null);
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [embeddingDimension, setEmbeddingDimension] = useState("1536");

  const [saving, setSaving] = useState<string | null>(null); // role_type or null
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const [loadedProviders, loadedRoles] = await Promise.all([
        listProviders({ signal }),
        listModelRoles({ signal }),
      ]);
      setProviders(loadedProviders);

      const chatRole = loadedRoles.find((r) => r.role_type === "chat");
      const embeddingRole = loadedRoles.find((r) => r.role_type === "embedding");

      if (chatRole) {
        setChatProviderId(chatRole.provider_id);
        setChatModel(chatRole.model_name);
      }
      if (embeddingRole) {
        setEmbeddingProviderId(embeddingRole.provider_id);
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

  const handleSave = async (roleType: string) => {
    setSaving(roleType);
    setSaveError(null);
    setSaveMessage(null);

    const payload: ModelRoleUpsertRequest = {
      provider_id: roleType === "chat" ? chatProviderId : embeddingProviderId,
      model_name: roleType === "chat" ? chatModel.trim() : embeddingModel.trim(),
      embedding_dimension:
        roleType === "embedding" ? Number(embeddingDimension) || null : undefined,
    };

    if (!payload.model_name) {
      setSaveError("Model name is required.");
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
          detail="Add a provider in the Providers tab before configuring model roles."
        />
      )}

      {/* Chat Role */}
      <Panel title="Chat Model Role">
        <p className="mb-4 text-xs text-stone-500">
          Select the provider and model to use for AI chat generation.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="chat-provider"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Provider
            </label>
            <select
              id="chat-provider"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              value={chatProviderId ?? ""}
              onChange={(e) => setChatProviderId(e.target.value || null)}
              disabled={providers.length === 0}
            >
              <option value="">Unset (use active provider default)</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="chat-model"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Chat model
            </label>
            <input
              id="chat-model"
              type="text"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              placeholder="e.g. gpt-4o"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSave("chat")}
            disabled={saving !== null}
          >
            {saving === "chat" ? "Saving..." : "Save Chat Role"}
          </button>
        </div>
      </Panel>

      {/* Embedding Role */}
      <Panel title="Embedding Model Role">
        <p className="mb-4 text-xs text-stone-500">
          Select the provider and model to use for embedding generation.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="embedding-provider"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Provider
            </label>
            <select
              id="embedding-provider"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              value={embeddingProviderId ?? ""}
              onChange={(e) => setEmbeddingProviderId(e.target.value || null)}
              disabled={providers.length === 0}
            >
              <option value="">Unset (use active provider default)</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="embedding-model"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Embedding model
            </label>
            <input
              id="embedding-model"
              type="text"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              placeholder="e.g. text-embedding-3-small"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
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
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              placeholder="1536"
              min={1}
              max={8192}
              value={embeddingDimension}
              onChange={(e) => setEmbeddingDimension(e.target.value)}
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
