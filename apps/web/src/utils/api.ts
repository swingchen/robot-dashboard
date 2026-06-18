const DEFAULT_API_PORT = 3001;

export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    `//${window.location.hostname}:${DEFAULT_API_PORT}/api`
  );
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}
