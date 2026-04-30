export type MessageDisplayConfig = {
  show_model_name: boolean;
  show_timestamp: boolean;
  show_token_count: boolean;
  show_response_delay: boolean;
};

const STORAGE_KEY = "asteria_message_display";

const defaults: MessageDisplayConfig = {
  show_model_name: true,
  show_timestamp: true,
  show_token_count: true,
  show_response_delay: true,
};

export function readMessageDisplayConfig(): MessageDisplayConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore parse errors, fall back to defaults.
  }
  return { ...defaults };
}

export function saveMessageDisplayConfig(config: MessageDisplayConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable or quota exceeded; preference is still active for this session.
  }
}
