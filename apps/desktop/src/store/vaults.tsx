import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createRepository,
  getCurrentRepository,
  listRepositories,
  selectRepository,
  unlinkRepository,
} from "../api/client";
import type { Repository } from "../api/types";
import { toErrorMessage } from "../lib/errors";
import type { Vault } from "../types/vault";

interface VaultContextValue {
  vaults: Vault[];
  activeVault: Vault | null;
  isLoading: boolean;
  error: string | null;
  refreshVaults: () => Promise<void>;
  addVault: (name: string, path: string) => Promise<Vault>;
  removeVault: (id: string) => Promise<void>;
  setActiveVault: (id: string) => Promise<void>;
  clearError: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshVaults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [repositories, currentRepository] = await Promise.all([
        listRepositories(),
        getCurrentRepository(),
      ]);
      setVaults(repositories.map(mapRepositoryToVault));
      setActiveId(currentRepository?.id ?? null);
    } catch (err) {
      setVaults([]);
      setActiveId(null);
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshVaults();
  }, [refreshVaults]);

  const activeVault = activeId
    ? vaults.find((vault) => vault.id === activeId) ?? null
    : null;

  const addVault = useCallback(
    async (name: string, path: string): Promise<Vault> => {
      setError(null);
      try {
        const repository = await createRepository({ name, root_path: path });
        await refreshVaults();
        return mapRepositoryToVault(repository);
      } catch (err) {
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [refreshVaults],
  );

  const removeVault = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await unlinkRepository(id);
        await refreshVaults();
      } catch (err) {
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [refreshVaults],
  );

  const setActiveVault = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await selectRepository(id);
        await refreshVaults();
      } catch (err) {
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [refreshVaults],
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <VaultContext.Provider
      value={{
        vaults,
        activeVault,
        isLoading,
        error,
        refreshVaults,
        addVault,
        removeVault,
        setActiveVault,
        clearError,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVaults(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error("useVaults must be used within a VaultProvider");
  }
  return ctx;
}

function mapRepositoryToVault(repository: Repository): Vault {
  return {
    id: repository.id,
    name: repository.name,
    path: repository.root_path,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at,
    status: repository.status,
    unlinkedAt: repository.unlinked_at,
  };
}
