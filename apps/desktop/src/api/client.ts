import { API_BASE_URL } from "./config";
import type { HealthResponse } from "./types";

export class ApiClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function readErrorDetail(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return null;
}

async function requestJson<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers
      }
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiClientError(`Unable to reach local API at ${API_BASE_URL}.`);
  }

  if (!response.ok) {
    let detail: string | null = null;

    try {
      detail = readErrorDetail(await response.json());
    } catch {
      detail = null;
    }

    const statusText = response.statusText || "error";
    const message = `Local API returned ${response.status} ${statusText}.`;
    throw new ApiClientError(detail ? `${message} ${detail}` : message, response.status);
  }

  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new ApiClientError("Local API returned an invalid JSON response.");
  }
}

export function getHealth(init?: RequestInit): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health", init);
}
