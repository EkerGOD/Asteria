import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { listModelRoles, listProviders, upsertModelRole } from "../api/client";
import { providerModelNames } from "../lib/provider";

export type AvailableModel = {
  provider_id: string;
  provider_name: string;
  model_name: string;
};

type ModelRoleContextValue = {
  chatModel: string;
  chatProviderId: string | null;
  availableModels: AvailableModel[];
  setChatModel: (providerId: string, modelName: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ModelRoleContext = createContext<ModelRoleContextValue | null>(null);

export function useModelRole(): ModelRoleContextValue {
  const ctx = useContext(ModelRoleContext);
  if (!ctx) {
    throw new Error("useModelRole must be used within ModelRoleProvider");
  }
  return ctx;
}

export function ModelRoleProvider({ children }: { children: ReactNode }) {
  const [chatModel, setChatModelState] = useState("");
  const [chatProviderId, setChatProviderId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [providers, roles] = await Promise.all([listProviders(), listModelRoles()]);
      const models = providers.flatMap((provider) => {
        const modelNames = providerModelNames(provider);
        return modelNames.map((modelName) => ({
          provider_id: provider.id,
          provider_name: provider.name,
          model_name: modelName,
        }));
      });
      setAvailableModels(models);

      const chatRole = roles.find((r) => r.role_type === "chat");
      if (chatRole) {
        setChatProviderId(chatRole.provider_id);
        setChatModelState(chatRole.model_name);
      } else if (models.length > 0) {
        setChatProviderId(models[0].provider_id);
        setChatModelState(models[0].model_name);
      } else {
        setChatProviderId(null);
        setChatModelState("");
      }
    } catch {
      setError("Failed to load model roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setChatModel = useCallback(
    async (providerId: string, modelName: string) => {
      await upsertModelRole("chat", { provider_id: providerId, model_name: modelName });
      setChatProviderId(providerId);
      setChatModelState(modelName);
    },
    [],
  );

  const value = useMemo<ModelRoleContextValue>(
    () => ({
      chatModel,
      chatProviderId,
      availableModels,
      setChatModel,
      isLoading,
      error,
      refresh: load,
    }),
    [chatModel, chatProviderId, availableModels, setChatModel, isLoading, error, load],
  );

  return <ModelRoleContext.Provider value={value}>{children}</ModelRoleContext.Provider>;
}
