const BASE = '/api/v1';

function getActiveHomeHeader(): Record<string, string> {
  const id = localStorage.getItem('domitara_activeHomeId');
  if (!id) return {};
  // localStorage stores JSON-encoded values when using atomWithStorage
  try {
    const parsed = JSON.parse(id);
    if (typeof parsed === 'string') return { 'X-Active-Home': parsed };
  } catch {
    // raw string fallback
    if (id !== 'null') return { 'X-Active-Home': id };
  }
  return {};
}

async function request<T>(
  path: string,
  opts?: RequestInit & { skipContentType?: boolean }
): Promise<T> {
  const { skipContentType, ...fetchOpts } = opts ?? {};
  const resp = await fetch(BASE + path, {
    ...fetchOpts,
    credentials: 'include',
    headers: {
      ...(skipContentType ? {} : { 'Content-Type': 'application/json' }),
      ...getActiveHomeHeader(),
      ...fetchOpts.headers,
    },
  });

  if (resp.status === 401) {
    await fetch(BASE + '/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (resp.status === 204) return undefined as T;
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error((err as { error?: string }).error ?? resp.statusText);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData, skipContentType: true }),
};
