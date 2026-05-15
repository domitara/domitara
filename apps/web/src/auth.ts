const TOKEN_KEY = 'domitara_token';

interface JwtPayload {
  sub: number;
  name: string;
  email: string;
  role: 'admin' | 'member';
  exp: number;
  iat: number;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    const payload = parseJwt(token);
    if (!payload) return false;
    return Date.now() / 1000 < payload.exp;
  },

  getUser: (): JwtPayload | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const payload = parseJwt(token);
    if (!payload || Date.now() / 1000 >= payload.exp) return null;
    return payload;
  },

  isAdmin: (): boolean => auth.getUser()?.role === 'admin',
};
