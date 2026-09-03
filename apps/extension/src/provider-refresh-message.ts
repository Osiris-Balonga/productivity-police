export const REFRESH_PROVIDERS_MESSAGE = "REFRESH_PROVIDERS";

export interface RefreshProvidersMessage {
  readonly type: typeof REFRESH_PROVIDERS_MESSAGE;
}

export interface RefreshProvidersResponse {
  readonly refreshed: boolean;
}

export function isRefreshProvidersMessage(
  value: unknown,
): value is RefreshProvidersMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).type === REFRESH_PROVIDERS_MESSAGE
  );
}
