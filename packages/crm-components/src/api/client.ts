export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface CrmClientConfig {
  /** Base URL prepended to every `path` passed to `api()`, e.g. `http://localhost:8080/api`. */
  baseUrl: string;
  /** Optional accessor returning the current bearer token; called on every request. */
  getToken?: () => string | null | undefined;
  /** Invoked when the server returns 401. Wire this to your own session-clearing logic. */
  onUnauthorized?: () => void;
}

export interface CrmClient {
  api<T>(path: string, init?: RequestInit): Promise<T>;
  readonly baseUrl: string;
}

export function createCrmClient(config: CrmClientConfig): CrmClient {
  const { baseUrl, getToken, onUnauthorized } = config;

  async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = getToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Accept", "application/json");

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });

    if (res.status === 401) {
      onUnauthorized?.();
      throw new ApiError(401, "Unauthorized");
    }

    if (res.status === 204) {
      return undefined as T;
    }

    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = await res.text();
        if (body) message = `${message}: ${body}`;
      } catch {
        // swallow body-read errors; the status line is enough
      }
      throw new ApiError(res.status, message);
    }

    if (res.status === 200 || res.status === 201) {
      return (await res.json()) as T;
    }

    return undefined as T;
  }

  return { api, baseUrl };
}
