export interface Vault {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "unlinked";
  unlinkedAt: string | null;
}
