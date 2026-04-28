import { API_BASE_URL } from "./config";
import type {
  HealthResponse,
  Provider,
  ProviderCreateRequest,
  ProviderHealthResponse,
  ProviderUpdateRequest
} from "./types";

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

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "object" && item !== null && "msg" in item) {
            const message = (item as { msg: unknown }).msg;
            return typeof message === "string" ? message : null;
          }

          return null;
        })
        .filter((message): message is string => Boolean(message))
        .join(" ");
    }
  }

  return null;
}

function requestJsonBody<TResponse>(
  path: string,
  method: "POST" | "PUT",
  body?: unknown,
  init?: RequestInit
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    method,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    body: JSON.stringify(body ?? {})
  });
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

export function listProviders(init?: RequestInit): Promise<Provider[]> {
  return requestJson<Provider[]>("/api/providers", init);
}

export function createProvider(payload: ProviderCreateRequest, init?: RequestInit): Promise<Provider> {
  return requestJsonBody<Provider>("/api/providers", "POST", payload, init);
}

export function updateProvider(
  providerId: string,
  payload: ProviderUpdateRequest,
  init?: RequestInit
): Promise<Provider> {
  return requestJsonBody<Provider>(`/api/providers/${providerId}`, "PUT", payload, init);
}

export function activateProvider(providerId: string, init?: RequestInit): Promise<Provider> {
  return requestJsonBody<Provider>(`/api/providers/${providerId}/activate`, "POST", undefined, init);
}

export function checkProviderHealth(providerId: string, init?: RequestInit): Promise<ProviderHealthResponse> {
  return requestJsonBody<ProviderHealthResponse>(
    `/api/providers/${providerId}/health-check`,
    "POST",
    undefined,
    init
  );
}
