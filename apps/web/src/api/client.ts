const BASE = '/api/v1';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const resp = await fetch(BASE + path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
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
};
