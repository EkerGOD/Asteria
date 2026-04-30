export type LoadStatus = "loading" | "success" | "error";

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Request failed.";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export interface FileSystemErrorInfo {
  action: string;
  path: string;
  reason: string;
  message: string;
}

export function toFileSystemErrorInfo(
  action: string,
  path: string,
  error: unknown,
): FileSystemErrorInfo {
  const reason = toErrorMessage(error);

  return {
    action,
    path,
    reason,
    message: `Could not ${action}.`,
  };
}
