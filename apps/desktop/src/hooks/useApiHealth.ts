import { useCallback, useEffect, useState } from "react";
import { getHealth } from "../api/client";
import type { HealthResponse } from "../api/types";

type ApiHealthState =
  | {
      status: "loading";
      data: null;
      error: null;
    }
  | {
      status: "success";
      data: HealthResponse;
      error: null;
    }
  | {
      status: "error";
      data: null;
      error: string;
    };

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to check local API health.";
}

export function useApiHealth() {
  const [state, setState] = useState<ApiHealthState>({
    status: "loading",
    data: null,
    error: null
  });

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setState({
      status: "loading",
      data: null,
      error: null
    });

    try {
      const data = await getHealth({ signal });
      setState({
        status: "success",
        data,
        error: null
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setState({
        status: "error",
        data: null,
        error: toErrorMessage(error)
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);

    return () => controller.abort();
  }, [loadHealth]);

  const refresh = useCallback(() => {
    void loadHealth();
  }, [loadHealth]);

  return {
    ...state,
    refresh
  };
}
