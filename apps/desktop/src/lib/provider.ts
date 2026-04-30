import type { Provider } from "../api/types";

export function providerModelNames(provider: Provider): string[] {
  if (provider.models.length > 0) {
    return provider.models.map((model) => model.name);
  }
  if (provider.chat_model) {
    return [provider.chat_model];
  }
  return [];
}
