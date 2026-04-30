import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Vault } from "../types/vault";

const STORAGE_KEY = "asteria_vaults";
const ACTIVE_KEY = "asteria_active_vault_id";

function readVaults(): Vault[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Vault[];
  } catch {
    return [];
  }
}

function writeVaults(vaults: Vault[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vaults));
}

function readActiveVaultId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function writeActiveVaultId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

interface VaultContextValue {
  vaults: Vault[];
  activeVault: Vault | null;
  addVault: (name: string, path: string) => Vault;
  removeVault: (id: string) => void;
  setActiveVault: (id: string | null) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vaults, setVaults] = useState<Vault[]>(() => readVaults());
  const [activeId, setActiveId] = useState<string | null>(() => readActiveVaultId());

  const activeVault = vaults.find((v) => v.id === activeId) ?? vaults[0] ?? null;

  const addVault = (name: string, path: string): Vault => {
    const vault: Vault = {
      id: crypto.randomUUID(),
      name,
      path,
      createdAt: new Date().toISOString(),
    };
    const next = [...vaults, vault];
    setVaults(next);
    writeVaults(next);
    return vault;
  };

  const removeVault = (id: string): void => {
    const next = vaults.filter((v) => v.id !== id);
    setVaults(next);
    writeVaults(next);
    if (activeId === id) {
      const newActive = next[0]?.id ?? null;
      setActiveId(newActive);
      writeActiveVaultId(newActive);
    }
  };

  const setActiveVault = (id: string | null): void => {
    setActiveId(id);
    writeActiveVaultId(id);
  };

  useEffect(() => {
    if (!activeId || vaults.length === 0) return;
    if (!vaults.some((v) => v.id === activeId)) {
      const fallback = vaults[0]?.id ?? null;
      setActiveId(fallback);
      writeActiveVaultId(fallback);
    }
  }, [vaults, activeId]);

  return (
    <VaultContext.Provider value={{ vaults, activeVault, addVault, removeVault, setActiveVault }}>
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
