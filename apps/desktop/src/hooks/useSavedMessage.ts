import { useEffect, useState } from "react";

export function useSavedMessage(durationMs = 2200) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(null), durationMs);
    return () => window.clearTimeout(timeout);
  }, [savedMessage, durationMs]);

  return { savedMessage, setSavedMessage } as const;
}
