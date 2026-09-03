import { ProviderRefreshError } from "./provider-cache";

export interface ProviderHttpRequest {
  readonly method: "GET" | "POST" | "DELETE";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | undefined;
}

export interface ProviderHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: unknown;
}

export type ProviderHttpClient = (
  request: Readonly<ProviderHttpRequest>,
) => Promise<Readonly<ProviderHttpResponse>>;

export function assertSuccessfulResponse(
  response: Readonly<ProviderHttpResponse>,
): void {
  if (response.status >= 200 && response.status < 300) {
    return;
  }
  if (response.status === 401) {
    throw new ProviderRefreshError("AUTH_EXPIRED");
  }
  if (
    response.status === 429 ||
    response.headers["x-ratelimit-remaining"] === "0"
  ) {
    throw new ProviderRefreshError("RATE_LIMITED");
  }
  throw new ProviderRefreshError("PROVIDER_ERROR");
}

export async function requestProvider(
  client: ProviderHttpClient,
  request: Readonly<ProviderHttpRequest>,
): Promise<Readonly<ProviderHttpResponse>> {
  try {
    const response = await client(request);
    assertSuccessfulResponse(response);
    return response;
  } catch (error) {
    if (error instanceof ProviderRefreshError) {
      throw error;
    }
    throw new ProviderRefreshError("NETWORK_ERROR");
  }
}

export function readRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
