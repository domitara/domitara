import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// jsdom's window.location is not fully writable; replace with a plain object.
Object.defineProperty(window, 'location', { writable: true, value: { href: '' } });

import { api } from './client';

type MockResponseOpts = { status: number; body?: unknown; ok?: boolean };

function mockResponse({ status, body, ok = status < 400 }: MockResponseOpts) {
  return Promise.resolve({
    status,
    ok,
    statusText: 'Status Text',
    json: () => Promise.resolve(body ?? {}),
  });
}

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  window.location.href = '';
});

describe('active home header', () => {
  it('omits header when localStorage is empty', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.get('/test');
    expect(mockFetch.mock.calls[0][1].headers['X-Active-Home']).toBeUndefined();
  });

  it('sends X-Active-Home from JSON-encoded localStorage value', async () => {
    localStorage.setItem('domitara_activeHomeId', JSON.stringify('home-123'));
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.get('/test');
    expect(mockFetch.mock.calls[0][1].headers['X-Active-Home']).toBe('home-123');
  });

  it('sends X-Active-Home from raw localStorage string', async () => {
    localStorage.setItem('domitara_activeHomeId', 'home-456');
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.get('/test');
    expect(mockFetch.mock.calls[0][1].headers['X-Active-Home']).toBe('home-456');
  });

  it('omits header when localStorage value is null', async () => {
    localStorage.setItem('domitara_activeHomeId', 'null');
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.get('/test');
    expect(mockFetch.mock.calls[0][1].headers['X-Active-Home']).toBeUndefined();
  });
});

describe('response handling', () => {
  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 204 }));
    const result = await api.get('/test');
    expect(result).toBeUndefined();
  });

  it('throws with server error message on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ status: 400, body: { error: 'bad request' }, ok: false })
    );
    await expect(api.get('/test')).rejects.toThrow('bad request');
  });

  it('throws statusText when error body has no error field', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 500, body: {}, ok: false }));
    await expect(api.get('/test')).rejects.toThrow();
  });

  it('on 401: calls logout endpoint and redirects to /login', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ status: 401, ok: false }))
      .mockReturnValueOnce(mockResponse({ status: 204 }));
    await expect(api.get('/protected')).rejects.toThrow('Unauthorized');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(window.location.href).toBe('/login');
  });
});

describe('api methods', () => {
  it('api.post sends method, JSON body, and Content-Type', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: { id: 1 } }));
    await api.post('/items', { name: 'test' });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/items');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('api.put sends PUT method', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.put('/items/1', { name: 'updated' });
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
  });

  it('api.patch sends PATCH method', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.patch('/items/1', { name: 'patched' });
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
  });

  it('api.delete sends DELETE method', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 204 }));
    await api.delete('/items/1');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('api.upload omits Content-Type header for multipart', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: { id: 2 } }));
    await api.upload('/photos', new FormData());
    expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });

  it('api.upload sends POST method', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ status: 200, body: {} }));
    await api.upload('/photos', new FormData());
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });
});
